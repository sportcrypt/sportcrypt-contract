let testlib = require('./lib/testlib.js');


testlib.doTests([
{
  desc: "change order price",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.details.price = testlib.scUtil.normalizeComponent(41, 8),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "change order amount",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.details.amount = testlib.scUtil.normalizeComponent(1001, 256),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "change order match id",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.details.matchId = testlib.scUtil.normalizeComponent(0, 256),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "change order sig.r",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.sig.r = testlib.scUtil.normalizeComponent(1823241, 256),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "change order sig.s",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.sig.s = testlib.scUtil.normalizeComponent(99999999999, 256),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "change order sig.v",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      modifyOrder: (o) => o.sig.v = testlib.scUtil.normalizeComponent(o.sig.v === '1c' ? '1b' : '1c', 8),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_BAD_SIG');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "trade after finalized",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'finalize', price: 0, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'MATCH_FINALIZED');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "order expired",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, expiryOffset: -1000, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_EXPIRED');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "order malformed",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    // Bad direction

    { action: 'order', from: 'A', amount: 1000, dir: 132, price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_MALFORMED');
      },
    },

    // Bad prices

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 0, orderId: 2, },
    { action: 'trade', from: 'B', orderId: 2, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_MALFORMED');
      },
    },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 100, orderId: 3, },
    { action: 'trade', from: 'B', orderId: 3, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_MALFORMED');
      },
    },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 212, orderId: 4, },
    { action: 'trade', from: 'B', orderId: 4, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_MALFORMED');
      },
    },


    // Bad order amount

    { action: 'order', from: 'A', amount: (new testlib.BigNumber(2).toPower(256).minus(1).div(50).floor()), dir: 'buy', price: 40, orderId: 5, },
    { action: 'trade', from: 'B', orderId: 5, amount: 500,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ORDER_MALFORMED');
      },
    },


    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "trade amount malformed",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 5000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: (new testlib.BigNumber(2).toPower(256).minus(1).div(50).floor()),
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'AMOUNT_MALFORMED');
      },
    },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "trade with self",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },

    { action: 'order', from: 'A', amount: 5000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'A', orderId: 1, amount: 1000,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'SELF_TRADE');
      },
    },

    { action: 'assert', balances: { A: 10000, }, positions: { A: 0, } },
  ],
},

]);
