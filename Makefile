deploy:
	grunt build
	chmod +x app/lib/git-directory-deploy/deploy.sh
	./app/lib/git-directory-deploy/deploy.sh
