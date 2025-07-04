# 色定義
RED := \033[1;31m
RESET := \033[0m

# 引数解析
ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
SUBCOMMAND := $(subst $(eval) ,$(eval) ,$(ARGS))

# デフォルトゴール（`make`が実行された場合に呼ばれる）
.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Usage: make <command> [subcommand]"
	@echo ""
	@echo "Commands:"
	@echo "  git		gitに関するコマンドを実行します (例: make git push)"
	@echo "  help		このヘルプメッセージを表示します (例: make help)"

#
# git コマンド群
#
.PHONY: git
git:
	@if [ "$(SUBCOMMAND)" = "push" ]; then \
		$(MAKE) git-push; \
	elif [ "$(SUBCOMMAND)" = "commit wip" ]; then \
		$(MAKE) git-commit-wip; \
	elif [ "$(SUBCOMMAND)" = "diff copy" ]; then \
		$(MAKE) git-diff-copy; \
	elif [ "$(SUBCOMMAND)" = "help" ] || [ "$(SUBCOMMAND)" = "-h" ] || [ -z "$(SUBCOMMAND)" ]; then \
		$(MAKE) git-help; \
	else \
		echo "Error: Unknown subcommand '$(RED)$(SUBCOMMAND)$(RESET)' for 'git'." >&2; \
		$(MAKE) git-help; \
		exit 1; \
	fi

.PHONY: git-push
git-push:
	@echo "🚀 Pushing to remote repository..."
	@git push origin
	@git push personal
	@echo "✅ Done!"

.PHONY: git-commit-wip
git-commit-wip:
	@echo "🚀 Creating WIP commit..."
	@git add .
	@git commit -m "WIP"
	@echo "✅ Done!"

.PHONY: git-diff-copy
git-diff-copy:
	@echo "🚀 Copying diff to clipboard..."
	@git diff | pbcopy
	@echo "✅ Done!"

.PHONY: git-help
git-help:
	@echo "Usage: make git <subcommand>"
	@echo ""
	@echo "Subcommands:"
	@echo "  push       	gitによるリモートリポジトリへのプッシュを行います。"
	@echo "  commit wip 	WIPコミットを作成します。"
	@echo "  help, -h   	このヘルプメッセージを表示します。"

# 引数として渡される追加のターゲットを無視するためのルール
%:
	@: