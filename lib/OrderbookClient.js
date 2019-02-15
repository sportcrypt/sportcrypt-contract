"use strict";

const initialReconnectTimeout = 500;
const reconnectTimeCeiling = 8000;

class OrderbookClient {
  constructor(opts) {
    this.opts = opts;

    this.nextId = 1;
    this.reqs = {};
    this.pendingMessagesToSend = [];
    this.reconnectTimeout = initialReconnectTimeout;

    this.heartBeatInterval = setInterval(() => {
      if (this.ws === undefined || this.ws.readyState != 1) return;
      this._send_ws_message('ping', {}, () => {});
    }, 55000);

    this.subscriptions = this.opts.subscriptions;
  }

  connect() {
    if (this.ws) { this.ws.close(); }
    this.ws = new this.opts.WebSocket(this.opts.endpoint);

    this.ws.onopen = () => {
      this.reconnectTimeout = initialReconnectTimeout;

      if (Object.keys(this.subscriptions).length) this._send_ws_message("subs", this.subscriptions, this.initialSubscriptionsCb);

      for (let msg of this.pendingMessagesToSend) {
        this.ws.send(msg);
      }

      this.pendingMessagesToSend = [];
    };

    this.ws.onmessage = (msg) => {
      let [header, body] = msg.data.split("\n");

      header = JSON.parse(header);
      body = JSON.parse(body);

      this._handle_msg(body);

      if (header['id']) {
        let id = '' + header['id'];

        if (this.reqs[id]) {
          let cb = this.reqs[id];
          delete this.reqs[id];
          cb(null, body);
        }
      }
    };

    this.ws.onclose = () => {
      if (this.shuttingDown) return;
      this.ws = undefined;

      if (this.timeoutWatcher) {
        clearTimeout(this.timeoutWatcher);
      }
      this.timeoutWatcher = setTimeout(() => this.connect(), this.reconnectTimeout);

      this.reconnectTimeout *= 2;
      if (this.reconnectTimeout > reconnectTimeCeiling) this.reconnectTimeout = reconnectTimeCeiling;
    };

    this.ws.onerror = (e) => {
      let ws = this.ws;
      delete this.ws;
      ws.close();
    };
  }



  subscribeOrders(matchId, latestOrderCounter) {
    if (!this.subscriptions.orders) this.subscriptions.orders = {};

    if (this.subscriptions.orders[matchId] !== undefined && latestOrderCounter <= this.subscriptions.orders[matchId]) return;

    this.subscriptions.orders[matchId] = latestOrderCounter;
    this._send_ws_message("subs", { orders: { [matchId]: latestOrderCounter } });
  }

  subscribeMatchTradeHist(matchId, latestMatchTradeHistCounter) {
    if (!this.subscriptions.mthist) this.subscriptions.mthist = {};

    if (this.subscriptions.mthist[matchId] !== undefined && latestMatchTradeHistCounter <= this.subscriptions.mthist[matchId]) return;

    this.subscriptions.mthist[matchId] = latestMatchTradeHistCounter;
    this._send_ws_message("subs", { mthist: { [matchId]: latestMatchTradeHistCounter } });
  }

  fetchSingleMatchInfo(matchId, cb) {
    this._send_ws_message("match-info", { matchId, }, cb);
  }

  fetchSingleTxInfo(txId, cb) {
    this._send_ws_message("tx-info", { txId, }, cb);
  }

  sendOrder(encodedOrder, cb) {
    this._send_ws_message("add-order", { order: encodedOrder }, cb);
  }

  sendChatmsg(msg, cb) {
    this._send_ws_message("add-chatmsg", msg, cb);
  }


  _send_ws_message(op, body, cb) {
    let id = this.nextId++;
    id = '' + id;

    let header = {
      op: op,
    };

    if (id !== undefined) header["id"] = parseInt(id);

    let msg = JSON.stringify(header) + "\n" + JSON.stringify(body);

    if (cb) this.reqs[id] = cb;

    if (this.ws === undefined || this.ws.readyState != 1) {
      this.pendingMessagesToSend.push(msg);
    } else {
      this.ws.send(msg);
    }
  }

  _handle_msg(body) {
    if (!Array.isArray(body)) {
      if (body.err) {
        console.warn("error from backend: " + body.err);
        if (this.opts.onError) this.opts.onError("Connection error: " + body.err);
      }

      return;
    }

    let newOrders = [];
    let newMatches = [];
    let newTransactions = [];
    let newMatchTradeHists = {};
    let newChatmsgs = [];
    let newTxStream = [];
    let newVol = [];
    let bulletin;

    for (let item of body) {
      if (item.op === 'match-latest') {
        this.subscriptions.match = item.latest;
      } else if (item.op === 'match-new') {
        newMatches.push(item.match);
      } else if (item.op === 'order-latest') {
        if (!this.subscriptions.orders) this.subscriptions.orders = {};
        this.subscriptions.orders[item.match] = item.latest;
      } else if (item.op === 'order-new') {
        newOrders.push(item.order);
      } else if (item.op === 'mthist-latest') {
        if (!this.subscriptions.mthist) this.subscriptions.mthist = {};
        this.subscriptions.mthist[item.match] = item.latest;
      } else if (item.op === 'mthist-new') {
        if (!newMatchTradeHists[item.match]) newMatchTradeHists[item.match] = [];
        Array.prototype.push.apply(newMatchTradeHists[item.match], item.mthist);
      } else if (item.op === 'tx-latest') {
        this.subscriptions['tx-latest'] = item.latest;
      } else if (item.op === 'tx-new') {
        newTransactions.push(item.tx);
      } else if (item.op === 'bulletin-latest') {
        this.subscriptions['bulletin'] = item.latest;
      } else if (item.op === 'bulletin-new') {
        bulletin = item.bulletin;
      } else if (item.op === 'chatmsg-latest') {
        this.subscriptions['chatmsg'] = item.latest;
      } else if (item.op === 'chatmsg-new') {
        newChatmsgs.push(item.chatmsg);
      } else if (item.op === 'txstream-latest') {
        this.subscriptions['txstream'] = item.latest;
      } else if (item.op === 'txstream-new') {
        newTxStream.push(item.txstream);
      } else if (item.op === 'vol-latest') {
        this.subscriptions['vol'] = item.latest;
      } else if (item.op === 'vol-new') {
        newVol.push(item.vol);
      } else {
        console.warn("unknown op", item);
      }
    }

    if (newOrders.length && this.onOrders) {
      this.onOrders(newOrders);
    }

    if (newMatches.length && this.onMatches) {
      this.onMatches(newMatches);
    }

    if (newTransactions.length && this.onTransactions) {
      this.onTransactions(newTransactions);
    }

    if (Object.keys(newMatchTradeHists).length && this.onMatchTradeHists) {
      this.onMatchTradeHists(newMatchTradeHists);
    }

    if (bulletin && this.onBulletin) {
      this.onBulletin(bulletin);
    }

    if (newChatmsgs.length && this.onChatmsgs) {
      this.onChatmsgs(newChatmsgs);
    }

    if (newTxStream.length && this.onTxStream) {
      this.onTxStream(newTxStream);
    }

    if (newVol.length && this.onVol) {
      this.onVol(newVol);
    }
  }


  shutdown() {
    this.shuttingDown = true;
    if (this.ws) this.ws.close();
    this.ws = undefined;
    if (this.heartBeatInterval) clearInterval(this.heartBeatInterval);
    this.heartBeatInterval = undefined;
  }
}


module.exports = OrderbookClient;
