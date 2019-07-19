#!/usr/bin/env ruby
# Usage: ruby chef_process_databag_item.rb --secret-file=data_bag_key --pretty-print encrypt < foo.json

# load Gemfile.lock to load 'chef' gem faster
if File.exist?("Gemfile.lock")
  begin
    require "bundler/setup"
  rescue LoadError
  end
end

begin
  require "chef/encrypted_data_bag_item"
rescue LoadError
  $stderr.puts "LoadError: `chef` gem is not installed.\n#{$!.backtrace.join("\n")}"
  exit 1
end

require "json"
require "optparse"

def encrypt(data, secret)
  Chef::EncryptedDataBagItem.encrypt_data_bag_item(data, secret)
end

def decrypt(data, secret)
  Chef::EncryptedDataBagItem.new(data, secret).to_hash
end

pretty_print = false
secret = nil

warn ARGV.inspect
OptionParser.new do |o|
  o.on("--[no-]pretty-print", TrueClass){|s| pretty_print = s }
  o.on("--secret-file FILE"){|s| secret = Chef::EncryptedDataBagItem.load_secret(s) }
  o.parse!(ARGV)
end

subcommand = ARGV.first
data = JSON.load(STDIN.read)

processed = case subcommand
when "encrypt"
  encrypt(data, secret)
when "decrypt"
  decrypt(data, secret)
else
  warn "Unknown command: #{subcommand.inspect}"
  exit 1
end


output = if pretty_print
  JSON.pretty_generate(processed)
else
  JSON.generate(processed)
end

STDOUT.write(output)
