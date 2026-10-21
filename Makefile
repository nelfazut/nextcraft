.PHONY: all test package deploy clean

all: test

test:
	node test/test_artcraft.js

package: test
	tar -czvf artcraft-1.1.0.tar.gz -C artcraft .

deploy:
	bash deploy.sh

clean:
	rm -f artcraft-*.tar.gz
