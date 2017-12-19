let testlib = require('./lib/testlib.js');


testlib.doTests([
{
  desc: "basic 1",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },
    { action: 'deposit', from: 'C', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, C: 10000 }, positions: { A: 832, B: -832, C: 0 } },

    { action: 'order', from: 'A', amount: 333, dir: 'sell', price: 60, orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: 1000, },

    { action: 'assert', balances: { A: 10166, B: 9501, C: 9501 }, positions: { A: 0, B: -832, C: 832 } },

    { action: 'order', from: 'A', amount: 333, dir: 'sell', price: 60, orderId: 3, },
    { action: 'trade', from: 'C', orderId: 3, amount: 1000, },

    { action: 'assert', balances: { A: 9834, B: 9501, C: 9002 }, positions: { A: -831, B: -832, C: 1663 } },

    { action: 'finalize', price: 0, },

    { action: 'assert', balances: { A: 10665, B: 10333, C: 9002 }, positions: { A: 0, B: 0, C: 0 } },
  ],
},


{
  desc: "basic 2",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },
    { action: 'deposit', from: 'C', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'buy', price: 40, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9667, B: 9501, C: 10000 }, positions: { A: 832, B: -832, C: 0 } },

    // almost the same as the 2 trades above, except for rounding difference
    { action: 'order', from: 'A', amount: 666, dir: 'sell', price: 60, orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: 5000, },

    { action: 'assert', balances: { A: 9833, B: 9501, C: 9001 }, positions: { A: -833, B: -832, C: 1665 } },

    { action: 'finalize', price: 0, },

    { action: 'assert', balances: { A: 10666, B: 10333, C: 9001 }, positions: { A: 0, B: 0, C: 0 } },
  ],
},


{
  desc: "basic 3",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },
    { action: 'deposit', from: 'C', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'sell', price: 70, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9786, B: 9501, C: 10000 }, positions: { A: -713, B: 713, C: 0 } },

    { action: 'order', from: 'A', amount: 214, dir: 'buy', price: 30, orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: 5000, },

    { action: 'assert', balances: { A: 10285, B: 9501, C: 9501 }, positions: { A: 0, B: 713, C: -713 } },

    { action: 'order', from: 'A', amount: 214, dir: 'buy', price: 30, orderId: 3, },
    { action: 'trade', from: 'C', orderId: 3, amount: 5000, },

    { action: 'assert', balances: { A: 10072, B: 9501, C: 9002 }, positions: { A: 712, B: 713, C: -1425 } },

    { action: 'finalize', price: 0, },

    { action: 'assert', balances: { A: 10072, B: 9501, C: 10427 }, positions: { A: 0, B: 0, C: 0 } },
  ],
},


{
  desc: "basic 4",
  actions: [
    { action: 'deposit', from: 'A', amount: 10000, },
    { action: 'deposit', from: 'B', amount: 10000, },
    { action: 'deposit', from: 'C', amount: 10000, },

    { action: 'order', from: 'A', amount: 1000, dir: 'sell', price: 70, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 500, },

    { action: 'assert', balances: { A: 9786, B: 9501, C: 10000 }, positions: { A: -713, B: 713, C: 0 } },

    // almost the same as the 2 trades above, except for rounding difference
    { action: 'order', from: 'A', amount: 428, dir: 'buy', price: 30, orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: 5000, },

    { action: 'assert', balances: { A: 10072, B: 9501, C: 9002 }, positions: { A: 712, B: 713, C: -1425 } },

    { action: 'finalize', price: 0, },

    { action: 'assert', balances: { A: 10072, B: 9501, C: 10427 }, positions: { A: 0, B: 0, C: 0 } },
  ],
},

{
  desc: "hit both rounding paths",
  actions: [
    { action: 'deposit', from: 'A', amount: 100000, },
    { action: 'deposit', from: 'B', amount: 100000, },
    { action: 'deposit', from: 'C', amount: 100000, },
 
    { action: 'order', from: 'A', amount: 100000, dir: 'buy', price: 25, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: 29764, },

    { action: 'order', from: 'B', amount: 100000, dir: 'buy', price: 82, orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: 61215, },

    { action: 'order', from: 'C', amount: 100000, dir: 'buy', price: 29, orderId: 3, },
    { action: 'trade', from: 'A', orderId: 3, amount: 75261, },

    { action: 'finalize', price: 0, },
  ],
},

{
  desc: "bigger amounts",
  actions: [
    { action: 'deposit', from: 'A', amount: testlib.toWei("1", "ether"), },
    { action: 'deposit', from: 'B', amount: testlib.toWei("1", "ether"), },
    { action: 'deposit', from: 'C', amount: testlib.toWei("1", "ether"), },

    { action: 'order', from: 'A', amount: testlib.toWei("1"), dir: 'sell', price: 55, orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: testlib.toWei(new testlib.BigNumber("0.2")), },

    { action: 'order', from: 'A', amount: testlib.toWei("1"), dir: 'buy', price: 45, orderId: 2, },
    { action: 'trade', from: 'B', orderId: 2, amount: testlib.toWei(new testlib.BigNumber(".07")), },

    { action: 'finalize', price: 100, },
  ],
},

]);
