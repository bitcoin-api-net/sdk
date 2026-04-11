.PHONY: help
#? help: Get more info on make commands
help: Makefile
	@echo " Choose a command to run:"
	@sed -n 's/^#?//p' $< | column -t -s ':' |  sort | sed -e 's/^/ /'
