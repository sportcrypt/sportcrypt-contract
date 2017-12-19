SOLC ?= solc

.PHONY: all clean test fuzz

all: build/SportCrypt.json

clean:
	rm -rf build/ .node-xmlhttprequest*

test: build/SportCrypt.json
	node t/interface.js
	node t/trade.js
	node t/depositWithdraw.js
	node t/orderCancel.js
	node t/orderExpiry.js
	node t/tradeError.js
	node t/finalization.js
	node t/fundsRecovery.js
	@echo
	@echo ALL TESTS PASSED.
	@echo

fuzz: build/SportCrypt.json
	perl t/fuzz/fuzz.pl

build/SportCrypt.json: SportCrypt.sol
	mkdir -p build/
	$(SOLC) --optimize --combined-json abi,bin SportCrypt.sol > build/SportCrypt.json.tmp
	mv build/SportCrypt.json.tmp build/SportCrypt.json
