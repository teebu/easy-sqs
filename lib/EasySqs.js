"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var reader = require("./QueueReader");
var errors = require("./CustomErrors");
var stream = require("./MessageStream");
var Queue = /** @class */ (function () {
    function Queue(queueName, sqs) {
        if (queueName == null)
            throw new errors.NullOrEmptyArgumentError("queueName");
        if (queueName.length == 0)
            throw new errors.InvalidArgumentError("queueName not provided");
        if (sqs == null)
            throw new errors.NullOrEmptyArgumentError("sqs");
        this.queueName = queueName;
        this.sqs = sqs;
    }
    //public createBatchDeleter(batchSize?: number) {
    //  return new md.MessageDeleter(this.sqs, this.queueName, batchSize, null);
    //}
    Queue.prototype.createQueueReader = function (batchSize, attributeNames) {
        return new reader.QueueReader(this.sqs, this.queueName, batchSize, attributeNames);
    };
    Queue.prototype.createMessageStream = function (highWaterMark, batchSize) {
        var rdr = new reader.QueueReader(this.sqs, this.queueName, batchSize);
        var opts = null;
        if (highWaterMark != null) {
            opts = {
                highWaterMark: highWaterMark
            };
        }
        return new stream.MessageStream(rdr, opts);
    };
    Queue.prototype.drain = function (callback) {
        var queue = this;
        var queueReader = queue.createQueueReader();
        queueReader
            .on("message", function (msg, context) {
            context.deleteMessage(msg);
        });
        queueReader
            .on("empty", function (err) {
            //all done, stop monitoring the queue
            queueReader.stop();
            if (callback != null) {
                callback(err);
            }
        });
        queueReader.start();
    };
    Queue.prototype.getMessage = function (callback) {
        var client = this.sqs;
        var params = {};
        params.QueueUrl = this.queueName,
            params.MaxNumberOfMessages = 1;
        client.receiveMessage(params, function (err, data) {
            if (data.Messages != null && data.Messages.length > 0) {
                var msg = data.Messages[0];
                callback(err, msg);
            }
        });
    };
    Queue.prototype.deleteMessage = function (msg, callback) {
        var client = this.sqs;
        var params = {};
        if (msg == null) {
            callback(new errors.NullOrEmptyArgumentError("msg"));
            return;
        }
        if (msg.ReceiptHandle == null || msg.ReceiptHandle.length == 0) {
            callback(new errors.InvalidArgumentError("msg.ReceiptHandle cannot be null or empty"));
            return;
        }
        params.QueueUrl = this.queueName,
            params.ReceiptHandle = msg.ReceiptHandle;
        client.deleteMessage(params, function (err, data) {
            callback(err);
        });
    };
    Queue.prototype.sendMessage = function (data, callback) {
        var client = this.sqs;
        if (data == null) {
            callback(new errors.NullOrEmptyArgumentError("Data cannot be null"));
            return;
        }
        if (data.length > 262144) {
            callback(new errors.InvalidArgumentError("data too large for SQS"));
            return;
        }
        var params = {};
        params.QueueUrl = this.queueName;
        params.MessageBody = data;
        client.sendMessage(params, function (err, data) {
            callback(err);
        });
    };
    return Queue;
}());
exports.Queue = Queue;
