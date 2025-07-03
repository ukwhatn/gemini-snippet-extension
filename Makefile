# 引数解析
ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
SUBCOMMAND := $(firstword $(ARGS))

# デフォルトゴール（`make`が実行された場合に呼ばれる）
.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Usage: make <command> [subcommand]"
	@echo ""
	@echo "Commands:"
	@echo "  proto		protobufに関するコマンドを実行します (例: make proto generate)"
	@echo "  help		このヘルプメッセージを表示します"

#
# proto コマンド群
#
.PHONY: proto
proto:
	@# サブコマンドに応じて処理を分岐させます。
	@if [ "$(SUBCOMMAND)" = "generate" ]; then \
		$(MAKE) proto-generate; \
	elif [ "$(SUBCOMMAND)" = "help" ] || [ "$(SUBCOMMAND)" = "-h" ] || [ -z "$(SUBCOMMAND)" ]; then \
		$(MAKE) proto-help; \
	else \
		echo "Error: Unknown subcommand '\033[1;31m$(SUBCOMMAND)\033[0m' for 'proto'." >&2; \
		$(MAKE) proto-help; \
		exit 1; \
	fi

.PHONY: proto-help
proto-help:
	@echo "Usage: make proto <subcommand>"
	@echo ""
	@echo "Subcommands:"
	@echo "  generate   .protoファイルからコードを生成します。"
	@echo "  help, -h   このヘルプメッセージを表示します。"

.PHONY: proto-generate
proto-generate:
	@echo "🚀 Generating protocol buffer files..."
	@# ここに `protoc` などの実際のコマンドを記述します。
	@# 例: protoc --proto_path=proto --go_out=gen/go proto/*.proto
	@echo "✅ Done."
