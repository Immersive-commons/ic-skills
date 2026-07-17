# frozen_string_literal: true

# Mock-transport tests for the immersivecommons client. No network, no live
# writes: a stub transport records every request and returns canned
# spec-shaped bodies. Run: ruby -Ilib test/test_client.rb

require "minitest/autorun"
require "json"
require_relative "../lib/immersivecommons"

module TransportHelper
  # handler.call(method, url, headers, body) -> [status, body_hash_or_string]
  def mock_transport(handler)
    calls = []
    transport = lambda do |method, url, headers, body|
      calls << { method: method, url: url, headers: headers.dup, body: body }
      status, out = handler.call(method, url, headers, body)
      text = out.is_a?(String) ? out : JSON.generate(out)
      [status, {}, text]
    end
    [transport, calls]
  end
end

class TableTest < Minitest::Test
  def test_operations_surface
    ops = ImmersiveCommons::OPERATIONS
    assert_equal 23, ops.length
    assert_equal "2026-07-16", ImmersiveCommons::API_VERSION
    assert ops["rsvpToEvent"][:idempotent]
    refute ops["askResearch"][:idempotent]
    assert ops["getMyTier"][:browser_session]
    refute ops["listUpcomingEvents"][:requires_auth]
    refute ops["batchPublicReads"][:requires_auth]
  end
end

class ReadTest < Minitest::Test
  include TransportHelper

  def test_public_read_no_auth_and_query
    t, calls = mock_transport(->(*) { [200, { "ok" => true, "events" => [], "count" => 0 }] })
    ic = ImmersiveCommons::Client.new(transport: t)
    res = ic.list_upcoming_events(limit: 3)
    assert res["ok"]
    assert_equal "https://www.immersivecommons.com/api/events/upcoming?limit=3", calls[0][:url]
    refute calls[0][:headers].key?("authorization")
  end

  def test_bearer_attaches_auth
    t, calls = mock_transport(->(*) { [200, { "ok" => true, "resources" => [] }] })
    ic = ImmersiveCommons::Client.new(token: "agt_test", transport: t)
    ic.list_resources
    assert_equal "Bearer agt_test", calls[0][:headers]["authorization"]
  end

  def test_required_query_param_encoded
    t, calls = mock_transport(->(*) { [200, { "ok" => true, "event" => {} }] })
    ic = ImmersiveCommons::Client.new(transport: t)
    ic.get_event_by_luma_url("https://luma.com/abc")
    assert_includes calls[0][:url], "luma=https%3A%2F%2Fluma.com%2Fabc"
  end
end

class WriteTest < Minitest::Test
  include TransportHelper

  def test_idempotent_write_headers_and_body
    t, calls = mock_transport(->(*) { [200, { "ok" => true, "queued" => true }] })
    ic = ImmersiveCommons::Client.new(token: "agt_test", transport: t)
    res = ic.rsvp_to_event("https://luma.com/x", email: "a@b.co", idempotency_key: "key-1")
    assert res["ok"]
    call = calls[0]
    assert_equal "POST", call[:method]
    assert_equal "key-1", call[:headers]["idempotency-key"]
    assert_equal "application/json", call[:headers]["content-type"]
    assert_equal({ "event_url" => "https://luma.com/x", "email" => "a@b.co" }, JSON.parse(call[:body]))
  end

  def test_idempotency_on_non_idempotent_op_raises_before_send
    t, calls = mock_transport(->(*) { [200, {}] })
    ic = ImmersiveCommons::Client.new(token: "agt_test", transport: t)
    assert_raises(ArgumentError) do
      ic.call("askResearch", body: { "q" => "hi" }, idempotency_key: "nope")
    end
    assert_empty calls
  end

  def test_sandbox_receipt_returned_verbatim
    receipt = { "ok" => true, "sandbox" => true, "simulated" => true,
                "would_have" => { "action" => "rsvpToEvent", "scope" => "events:rsvp", "args" => {} } }
    t, _calls = mock_transport(->(*) { [200, receipt] })
    ic = ImmersiveCommons::Client.new(token: "agt_sb", sandbox: true, transport: t)
    res = ic.rsvp_to_event("https://luma.com/x", email: "a@b.co")
    assert res["simulated"]
    assert_equal "events:rsvp", res["would_have"]["scope"]
  end
end

class ErrorTest < Minitest::Test
  include TransportHelper

  def test_typed_error_with_kind_and_retry
    t, _calls = mock_transport(->(*) {
      [429, { "error" => "rate_limited", "error_kind" => "rate_limit", "retry_after_seconds" => 42 }]
    })
    ic = ImmersiveCommons::Client.new(token: "agt_test", transport: t)
    err = assert_raises(ImmersiveCommons::ApiError) do
      ic.rsvp_to_event("https://luma.com/x", email: "a@b.co")
    end
    assert_equal 429, err.status
    assert_equal "rate_limit", err.error_kind
    assert_equal 42, err.retry_after_seconds
  end

  def test_nested_catchall_error_shape
    t, _calls = mock_transport(->(*) {
      [401, { "error" => { "code" => "unauthorized", "message" => "no token" } }]
    })
    ic = ImmersiveCommons::Client.new(transport: t)
    err = assert_raises(ImmersiveCommons::ApiError) { ic.get_my_activity }
    assert_includes err.message, "unauthorized: no token"
  end
end

class AuthTest < Minitest::Test
  include TransportHelper

  def test_device_code_loop
    polls = 0
    handler = lambda do |_method, url, _headers, _body|
      if url.include?("/signup/start")
        [200, { "device_code" => "dev_abc", "user_code" => "WXYZ-1",
                "verify_url" => "https://x/console", "expires_in" => 900, "interval" => 1 }]
      else
        polls += 1
        if polls < 2
          [200, { "status" => "pending" }]
        else
          [200, { "status" => "completed", "agent_token" => "agt_minted",
                  "granted_scopes" => ["events:rsvp"], "tier" => "ic-member", "sandbox" => true }]
        end
      end
    end
    t, calls = mock_transport(handler)
    ic = ImmersiveCommons::Client.new(sandbox: true, transport: t)
    prompted = nil
    res = ic.authorize(["events:rsvp"], client_name: "test",
                       on_prompt: ->(s) { prompted = s }, sleeper: ->(_s) {})
    assert_equal "agt_minted", res["token"]
    assert_equal ["events:rsvp"], res["granted_scopes"]
    assert res["sandbox"]
    assert_equal "WXYZ-1", prompted["user_code"]
    start_call = calls.find { |c| c[:url].include?("/signup/start") }
    assert JSON.parse(start_call[:body])["sandbox"]
  end
end
