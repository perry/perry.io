DIST_DIR=dist
S3_BUCKET=perry.io

build:
	grunt build

s3_upload:
	s3cmd sync $(DIST_DIR)/ s3://$(S3_BUCKET) --acl-public --delete-removed

deploy:
	@status=$$(git status --porcelain); \
	if test "x$${status}" = x; then \
		git pull; \
		git push; \
		make build; \
		make s3_upload; \
	else \
		echo Please commit all changes before deploying. >&2; \
	fi

