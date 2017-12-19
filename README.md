# SportCrypt Smart Contract

This repository contains the smart contract and associated testing code for the [SportCrypt](https://sportcrypt.com) prediction market.

Please read [our whitepaper](https://sportcrypt.com/whitepaper.pdf) for detailed design details.


## Repository Organization

* `SportCrypt.sol`
  The contract source code.
* `lib/`
  Javascript libraries for interacting with the smart contract.
* `scripts/`
  Scripts for deploying the contract, generating keys, and interacting with it manually.
* `t/`
  Tests and associated testing code.


## Build Instructions

Install the `solc` [solidity compiler](https://github.com/ethereum/solidity/releases) somewhere in your path (`0.4.18` or later).

Make sure you have a recent `node` installed (tested with version `8.6.0`).

Install npm dependencies:

    npm i

Compile and test:

    make test



## Testing

### testlib.js

The contract uses a custom test harness library found in `t/lib/testlib.js`. Each test starts a new instance of [testrpc](https://github.com/ethereumjs/testrpc/), creates a contract, adds admins, and then runs various actions specified in the test such as `order`, `trade`, and `finalize`. Several of these actions take callbacks so that parameters can be modified (ie to provide bad signatures). There is a special `assert` action that allows us to hand-calculate values in the test and ensure the contract computed them correctly.

After every action, a set of invariants are verified by querying the contract. We refer to these as the "white-box" invariant checks. They ensure that the contract is always in a consistent state. Some of the invariants are described in the Rounding Behaviour section below.

### Test Plan

* `t/interface.js`: Iterates over all methods in the ABI, ensures there are no unexpected non-constant functions, and that only `deposit` is payable.
* `t/trade.js`: Exercises the "happy-path" where trading suceeds. Position re-sale, position direction reversal, and the other various corner cases of the trade amount and finalization logic is tested.
* `t/depositWithdraw.js`: Makes sure funding works as expected: Balance is changed, attempting to withdraw more than balance results in withdrawing full balance and no more. Makes sure that funds are returned if you try to send eth to contract directly.
* `t/orderCancel.js`: Orders are cancelled and cannot be traded upon after, in both new order and partially-filled order cases.
* `t/orderExpiry.js`: Orders cannot be traded on after they expire.
* `t/tradeError.js`: Tests all the trade error statuses described below, including attempting to fake signatures (both by passing bad signature and changing order parameters).
* `t/finalization.js`: Verifies finalized matches cannot be traded on, finalization signatures can't be faked, that the signing address is actually an admin, and that rounding loss behaves as expected when finalization price is not 0 or 100 (see Rounding Behaviour section below).
* `t/fundsRecovery.js`: Verifies fund recovery can't be started prior to timeout, that funds can be succesfully recovered without finalization message after this time period, and that cancellation price is honored.
* `t/fuzz/fuzz.pl`: Chooses random trade prices/directions and executes them, trying to trigger the invariant assertions in the contract, or find violations with the white-box invariant checks in the test library. Because this test is non-deterministic, and also because it is an infinite loop, it is not run by default.

### Gas Accounting

The test-suite also tracks how much gas is consumed by each method and prints a short summary after each test run that lists the maximum, minimum, median, and average usage for each method.



## Smart Contract Interface

### Methods

This list of methods represent the entire non-constant interface to the contract. This is verified by the `t/interface.js` test.

Owner-only methods:

* `changeOwner`: Set a new owner.
* `addAdmin`: Adds an address that is allowed to sign event finalization messages.
* `removeAdmin`: Revokes the privileges added with `addAdmin`.

User methods:

* `deposit`: Adds funds to the sender's balance inside the smart contract. This is the only payable method (and that is verified by `t/interface.js`).
* `withdraw`: Deducts the sender's smart contract balance and sends it to their address with `transfer`. This method attempts to withdraw the maximum up to the specified amount. If the balance is less than this amount, the entire balance will be withdrawn.
* `cancelOrder`: Given a signed order, sets the `filledAmounts` value for this order to the order amount, ensuring that this order can no longer be traded on. The order must be signed by the sender. If the order is already expired, saves gas by not writing to `filledAmounts`.
* `trade`: Given a maximum trade amount and a signed order, attempts to create a trade with the amount at risk up to the specified amount. This will debit or credit the balances, and increase or decrease positions on the event specified in the order. See our whitepaper for full details. In the event of an error, a `LogTradeError` will be logged (see the Trade Status section below).
* `claim`: Given a signed finalization message and a match ID, finalizes the match and claims the sender's winnings for this match by decreasing the sender's position and crediting the sender's balance. This is an irreversible operation. After finalization, the signed finalization message is no longer required for claims.
* `recoverFunds`: Given a match ID, if a match has not been finalized and its funds recovery timeout period has elapsed, finalizes the match at its cancellation price.

### Trade Status

The `LogTradeError` log message contains a field called `status` which indicates why a trade was not made as the result of a `trade` method call. This is an enum with the following values:

* `OK` (0):
  Trade was created successfully.
* `MATCH_FINALIZED` (1):
  Cannot trade after a match has been finalized.
* `ORDER_EXPIRED` (2):
  The block this transaction was mined in has a `block.timestamp` greater than the order's expiry.
* `ORDER_MALFORMED` (3):
  The order was constructed incorrectly.
* `ORDER_BAD_SIG` (4):
  The order's signature does not match the signature of the order creator.
* `AMOUNT_MALFORMED` (5):
  An amount greater than `MAX_SANE_AMOUNT` was provided.
* `SELF_TRADE` (6):
  The sender and the order creator are the same account.
* `ZERO_VALUE_TRADE` (7):
  The trade amount was so small that, possibly due to rounding, one of the amounts at risk was zero.

## Order Packing

Orders are packed into 3 `uint256` values. This prevents us from exceeding Solidity's stack size limitation. The layout of the order array is as follows:

    // [0]: match hash
    // [1]: amount
    // [2]: 5-byte expiry, 5-byte nonce, 1-byte price, 1-byte direction, 20-byte address

Please see the whitepaper for details on these fields.



## Rounding Behaviour

The contract is designed to be wei-exact except in one case (described below).

After determining the amounts at risk for each party to a new trade, the contract verifies that the following invariants hold:

1. After adjusting positions, the sum of all the positions on a match must be 0.
1. The net of the change in balances must be the negative of the change in exposure for the match.

The exposure is the amount that will be claimable when the match finalizes. Due to invariant 1, this can be calculated as the sum of all positive positions on the match.

If invariant 2 does not hold because it is off-by-one, then rounding has occurred when calculating the balance deltas. If the exposure is one more than it should be, then the position delta is reduced by 1. If the exposure is one less than it should be, the extra wei is arbitrarily added to the balance of the party creating the long-side of the trade. In any other case, an assertion is triggered.

After applying this rounding compensation, the invariants are rechecked.

In our test-suite, these invariants are checked after every operation using a white-box view into the contract. As well as carefully chosen test values, we also have an amount fuzzer that exercises these invariant checks.

When a match is finalized at 0 or 100, then the winning positions will be transferred to the winners' balances, and the losing positions will (if ever claimed) be 0, so will not affect balances.

As mentioned above, there is one case where wei can be lost to the contract as dust. If a match is finalized at a finalization price other than 0 or 100, then any claimed amount will be rounded down to the nearest wei. This is necessary because positions can be divided up and sold to any number of participants.


## Contact

For any comments or questions about this smart contract, please [file a github issue](https://github.com/hoytech/sportcrypt-contract/issues/new).

For general discussion about SportCrypt, please use our [reddit](https://www.reddit.com/r/SportCrypt/) or [twitter](https://twitter.com/sportcrypt).
