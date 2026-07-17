# frozen_string_literal: true

# Thin, table-driven client for the Immersive Commons Agent REST API.
#
# `call` is the whole transport: it looks the operation up in the generated
# OPERATIONS table, attaches auth + Idempotency-Key when the spec allows, and
# sends the request. The named methods are typed facades over `call` — they
# add no routing of their own, so they cannot drift from the spec. Zero
# dependencies (stdlib net/http only).

require "json"
require "net/http"
require "timeout"
require "uri"

module ImmersiveCommons
  # Raised on a non-2xx response. Carries the parsed error body + metadata.
  class ApiError < StandardError
    attr_reader :status, :operation_id, :body, :error_kind, :retry_after_seconds

    def initialize(status, operation_id, body)
      @status = status
      @operation_id = operation_id
      @body = body.is_a?(Hash) ? body : {}
      @error_kind = @body["error_kind"].is_a?(String) ? @body["error_kind"] : nil
      ra = @body["retry_after_seconds"]
      @retry_after_seconds = ra.is_a?(Integer) ? ra : nil

      err = @body["error"]
      msg = if err.is_a?(String)
              err
            elsif err.is_a?(Hash)
              [err["code"], err["message"]].compact.join(": ")
            end
      msg = @body["message"] if (msg.nil? || msg.empty?) && @body["message"].is_a?(String)
      text = "#{operation_id} failed (HTTP #{status})"
      text += ": #{msg}" if msg && !msg.empty?
      super(text)
    end
  end

  class Client
    attr_reader :base_url, :sandbox, :user_agent
    attr_accessor :token

    # transport: an object responding to call(method, url, headers, body) ->
    # [status, headers, body_text]. Injectable for tests; defaults to Net::HTTP.
    def initialize(token: nil, base_url: DEFAULT_BASE_URL, sandbox: false,
                   timeout: 30, transport: nil, user_agent: nil)
      @base_url = base_url.sub(%r{/+\z}, "")
      @token = token
      # Documentation flag only: a sandbox token already behaves sandbox
      # server-side. This just makes authorize request one by default.
      @sandbox = sandbox
      @user_agent = user_agent || "immersivecommons-ruby/#{API_VERSION}"
      @transport = transport || default_transport(timeout)
    end

    # ---------------------------------------------------------------- generic

    def call(operation_id, query: nil, body: nil, idempotency_key: nil, token: nil)
      spec = OPERATIONS[operation_id]
      raise ArgumentError, "Unknown operationId: #{operation_id}" unless spec

      headers = { "accept" => "application/json", "user-agent" => @user_agent }
      tok = token || @token
      headers["authorization"] = "Bearer #{tok}" if tok

      data = nil
      if spec[:has_body] && !body.nil?
        headers["content-type"] = "application/json"
        data = JSON.generate(body)
      end

      if idempotency_key
        unless spec[:idempotent]
          raise ArgumentError, "#{operation_id} does not accept an Idempotency-Key"
        end
        headers["idempotency-key"] = idempotency_key
      end

      url = @base_url + spec[:path] + query_string(query)
      status, _resp_headers, text = @transport.call(spec[:method], url, headers, data)
      parsed = begin
        text && !text.empty? ? JSON.parse(text) : nil
      rescue JSON::ParserError
        nil
      end
      unless (200..299).cover?(status)
        raise ApiError.new(status, operation_id, parsed || { "error" => text })
      end
      parsed
    end

    # ------------------------------------------------------------------ reads

    def list_upcoming_events(limit: nil)
      call("listUpcomingEvents", query: limit.nil? ? nil : { "limit" => limit })
    end

    def get_event_by_luma_url(luma)
      call("getEventByLumaUrl", query: { "luma" => luma })
    end

    def search_directory(q: nil, limit: nil)
      call("searchDirectory", query: { "q" => q, "limit" => limit })
    end

    def list_resources
      call("listResources")
    end

    def get_my_activity(limit: nil)
      call("getMyActivity", query: limit.nil? ? nil : { "limit" => limit })
    end

    def get_my_leaderboard_status
      call("getMyLeaderboardStatus")
    end

    def get_donor_wall(limit: nil)
      call("getDonorWall", query: limit.nil? ? nil : { "limit" => limit })
    end

    def setup_check
      call("setupCheck")
    end

    # ----------------------------------------------------------------- writes

    def rsvp_to_event(event_url, email:, name: nil, idempotency_key: nil)
      body = { "event_url" => event_url, "email" => email }
      body["name"] = name unless name.nil?
      call("rsvpToEvent", body: body, idempotency_key: idempotency_key)
    end

    def request_event(event, idempotency_key: nil)
      call("requestEvent", body: event, idempotency_key: idempotency_key)
    end

    def book_resource(resource_id, start_iso:, end_iso:, email:, purpose: nil, idempotency_key: nil)
      body = { "resource_id" => resource_id, "start_iso" => start_iso,
               "end_iso" => end_iso, "email" => email }
      body["purpose"] = purpose unless purpose.nil?
      call("bookResource", body: body, idempotency_key: idempotency_key)
    end

    def set_leaderboard_optin(opt_in)
      call("setLeaderboardOptIn", body: { "optIn" => opt_in })
    end

    def ask_research(q, k: nil, sources: nil, synthesize: nil, model: nil)
      body = { "q" => q }
      body["k"] = k unless k.nil?
      body["sources"] = sources.to_a unless sources.nil?
      body["synthesize"] = synthesize unless synthesize.nil?
      body["model"] = model unless model.nil?
      call("askResearch", body: body)
    end

    def submit_highlight_pending(story, idempotency_key: nil)
      call("submitHighlightPending", body: story, idempotency_key: idempotency_key)
    end

    def submit_feedback(kind, message, **extra)
      body = { "kind" => kind, "message" => message }
      extra.each { |k, v| body[k.to_s] = v }
      call("submitFeedback", body: body)
    end

    def revoke_own_token
      call("revokeOwnToken")
    end

    # --------------------------------------------------------- device-code auth

    def start_signup(scopes, client_name: nil, sandbox: nil)
      body = { "scopes" => scopes.to_a }
      body["client_name"] = client_name unless client_name.nil?
      want = sandbox.nil? ? @sandbox : sandbox
      body["sandbox"] = true if want
      call("startSignup", body: body)
    end

    def poll_signup(device_code)
      call("pollSignup", query: { "device_code" => device_code })
    end

    # Runs the full RFC 8628 device-code grant and returns the minted token as
    # { "token", "granted_scopes", "tier", "sandbox" }. Does not store the
    # token on the client — assign client.token yourself if you want to.
    # on_prompt receives the start response (user_code, verify_url).
    # sleeper is injectable for tests.
    def authorize(scopes, client_name: "immersivecommons-ruby", sandbox: nil,
                  on_prompt: nil, timeout_seconds: nil, sleeper: ->(s) { sleep(s) })
      start = start_signup(scopes, client_name: client_name, sandbox: sandbox)
      on_prompt&.call(start)
      interval = [start["interval"].to_i, 1].max
      deadline = monotonic_now + (timeout_seconds || start["expires_in"] || 900)
      loop do
        raise Timeout::Error, "Device-code grant timed out before approval." if monotonic_now > deadline

        sleeper.call(interval)
        poll = poll_signup(start.fetch("device_code"))
        case poll["status"]
        when "completed"
          unless poll["agent_token"]
            raise ApiError.new(500, "pollSignup", { "error" => "completed without token" })
          end
          return {
            "token" => poll["agent_token"],
            "granted_scopes" => poll["granted_scopes"] || [],
            "tier" => poll["tier"],
            "sandbox" => !!poll["sandbox"]
          }
        when "cancelled"
          raise "Device-code grant cancelled: #{poll['reason']}".strip
        end
        # pending -> keep polling
      end
    end

    private

    def monotonic_now
      Process.clock_gettime(Process::CLOCK_MONOTONIC)
    end

    def query_string(query)
      return "" if query.nil?

      pairs = query.reject { |_k, v| v.nil? }
      return "" if pairs.empty?

      "?" + URI.encode_www_form(pairs)
    end

    def default_transport(timeout)
      lambda do |method, url, headers, body|
        uri = URI.parse(url)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = uri.scheme == "https"
        http.open_timeout = timeout
        http.read_timeout = timeout
        req = Net::HTTP.const_get(method.capitalize).new(uri, headers)
        req.body = body if body
        resp = http.request(req)
        [resp.code.to_i, resp.each_header.to_h, resp.body || ""]
      end
    end
  end
end
