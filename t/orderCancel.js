let testlib = require('./lib/testlib.js');


testlib.doTests([
{
  desc: "cancel unfilled order",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'cancel', from: 'A', orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "cancel partially-filled order",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 200, },
    { action: 'assert', balances: { A: 9867, B: 9801, }, positions: { A: 332, B: -332, } },

    { action: 'cancel', from: 'A', orderId: 1, },

    { action: 'trade', from: 'B', orderId: 1, amount: 200,
      cb: (receipt,logs) => {
        testlib.assertEqual(testlib.scUtil.decodeStatus(logs.error.args.status), 'ZERO_VALUE_TRADE');
      },
    },

    { action: 'assert', balances: { A: 9867, B: 9801, }, positions: { A: 332, B: -332, } },
  ],
},
]);
