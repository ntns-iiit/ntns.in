.PHONY: epub build serve

epub:
	find content -name "*.md" -exec grep -l "^type: essay" {} \; | while read f; do \
		dir=$$(dirname "$$f" | sed 's|^content|static|'); \
		mkdir -p "$$dir"; \
		pandoc "$$f" --standalone -o "$$dir/$$(basename "$${f%.md}").epub"; \
	done

build: epub
	hugo $(HUGO_FLAGS)

serve: epub
	hugo server
