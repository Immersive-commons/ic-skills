# frozen_string_literal: true

require_relative "lib/immersivecommons/version"

Gem::Specification.new do |spec|
  spec.name = "immersivecommons"
  spec.version = ImmersiveCommons::VERSION
  spec.authors = ["Immersive Commons"]
  spec.email = ["admin@immersivecommons.com"]

  spec.summary = "Thin, spec-derived Ruby client for the Immersive Commons Agent REST API."
  spec.description = "Official Ruby client for Immersive Commons (Floor 10 of Frontier Tower, " \
                     "a members-run AI builder space in San Francisco). Table-driven from the " \
                     "published OpenAPI spec: events & RSVPs, members directory, resource " \
                     "booking, research Q&A, and RFC 8628 device-code token minting. " \
                     "Zero runtime dependencies."
  spec.homepage = "https://www.immersivecommons.com"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.metadata = {
    "homepage_uri" => "https://www.immersivecommons.com",
    "documentation_uri" => "https://www.immersivecommons.com/developers",
    "source_code_uri" => "https://github.com/immersive-commons/ic-skills",
    "bug_tracker_uri" => "https://www.immersivecommons.com/developers",
    "rubygems_mfa_required" => "true"
  }

  spec.files = Dir["lib/**/*.rb"] + ["lib/immersivecommons/openapi.json", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]
end
