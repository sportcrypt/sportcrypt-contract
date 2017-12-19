let testlib = require('./lib/testlib.js');


testlib.doTests([
{
  desc: "can't trade new order after finalization",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'finalize', price: 100, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "can't trade partial order after finalization",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },

    { action: 'finalize', price: 100, },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 10499, B: 9501, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "bad sig.r value on finalization msg",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'finalize',
      price: 100,
      cb: (msg) => {
        msg.sig.r = testlib.scUtil.normalizeComponent(0, 256);
      },
      expectError: true,
    },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },
  ],
},

{
  desc: "bad sig.s value on finalization msg",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'finalize',
      price: 100,
      cb: (msg) => {
        msg.sig.s = testlib.scUtil.normalizeComponent(1238723, 256);
      },
      expectError: true,
    },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },
  ],
},

{
  desc: "bad sig.v value on finalization msg",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'finalize',
      price: 100,
      cb: (msg) => {
        msg.sig.v = testlib.scUtil.normalizeComponent(msg.sig.v === '1c' ? '1b' : '1c', 8);
      },
      expectError: true,
    },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },
  ],
},

{
  desc: "OK sig, but no such admin",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },

    { action: 'removeAdmin', },
    { action: 'finalize', price: 100,
      expectError: true,
    },

    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },
  ],
},

{
  desc: "finalize at 50, even odds, no rounding loss",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 50, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9500, B: 9500, }, positions: { A: 1000, B: -1000, } },

    { action: 'finalize', price: 50, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "finalize at 50, non-even odds, no rounding loss",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, }, positions: { A: 832, B: -832, } },

    { action: 'finalize', price: 50, },

    { action: 'assert', balances: { A: 10083, B: 9917, }, positions: { A: 0, B: 0, } },
  ],
},

{
  desc: "finalize at 50, with rounding loss",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },

    { action: 'assert', balances: { A: 10000, B: 10000, }, positions: { A: 0, B: 0, } },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 501, },

    { action: 'assert', balances: { A: 9666, B: 9499, }, positions: { A: 835, B: -835, } },

    { action: 'finalize', price: 50, roundingLoss: 1, },

    { action: 'assert', balances: { A: 10083, B: 9916, }, positions: { A: 0, B: 0, } },
  ],
},

]);
