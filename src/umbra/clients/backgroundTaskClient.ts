import { ClientReadableStream } from "@grpc/grpc-js";
import { BackgroundTaskClientClient } from "../../generated/Client/BackgroundTaskClient";
import { BaseClient } from "../baseClient";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientStore } from "../store";
import { BackgroundTaskChangedMessage } from "../../generated/Common/Types/BackgroundTaskServiceTypes";

export class BackgroundTaskClient extends BaseClient {
    private client: BackgroundTaskClientClient;
    private taskChangeStream: ClientReadableStream<BackgroundTaskChangedMessage> | undefined;

    constructor(store: ClientStore) {
        super(store);
        this.client = new BackgroundTaskClientClient(store.connectionString!, store.credentials!);
    }

    public async pauseBackgroundTask(taskId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.manageBackgroundTask({
                backgroundTaskId: taskId,
                requestId: this.store.createRequestId(),
                pause: true,
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to pause background task"));
                }
                resolve();
            });
        });
    }

    public async continueBackgroundTask(taskId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.manageBackgroundTask({
                backgroundTaskId: taskId,
                requestId: this.store.createRequestId(),
                continue: true,
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to continue background task"));
                }
                resolve();
            });
        });
    }

    public receiveBackgroundTaskChanges(): ClientReadableStream<BackgroundTaskChangedMessage> {
        if (!this.taskChangeStream) {
            this.taskChangeStream = this.client.receiveBackgroundTaskChanges({ requestId: this.store.createRequestId() }, this.store.getMetadata());
        }
        return this.taskChangeStream;
    }

    public async close(): Promise<void> {
        await gracefulStopReadableStream(this.taskChangeStream);
        this.client.close();
    }
}


