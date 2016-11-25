install:
	npm install
	./node_modules/bower/bin/bower install

deploy:
	./node_modules/grunt-cli/bin/grunt build
	chmod +x app/lib/git-directory-deploy/deploy.sh
	./app/lib/git-directory-deploy/deploy.sh
