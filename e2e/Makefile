# Post for Me — e2e test orchestrator
#
# Each sub-suite is a self-contained project with its own toolchain.
# The Makefile is the single entry point that wires them together.
#
# Prerequisites: bun (https://bun.sh) installed in PATH.
#
# Usage:
#   make install       # bun install in every sub-suite
#   make test          # run the full surface: REST + SDK (Node)
#   make test-rest     # raw-HTTP REST tests only
#   make test-sdk      # all SDK suites (currently: Node only)
#   make test-sdk-node # the post-for-me npm client suite

.PHONY: test test-rest test-sdk test-sdk-node install

install:
	cd rest && bun install
	cd sdk/node && bun install

test: test-rest test-sdk-node

test-rest:
	cd rest && bun run test

test-sdk: test-sdk-node

test-sdk-node:
	cd sdk/node && bun run test
