.PHONY: all test build-engine package deploy clean

all: test

test:
	node test/test_artcraft.js

build-engine:
	bash engine/build.sh

package: test
	tar -czvf artcraft-1.1.0.tar.gz -C artcraft .

deploy:
	bash deploy.sh

clean:
	rm -f artcraft-*.tar.gz
