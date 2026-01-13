import { ClientReadableStream } from "@grpc/grpc-js";
import { UserClientClient } from "../../generated/Client/UserClient";
import { UserContextDescriptor, UserContextResponse_EBindError } from "../../generated/Common/Types/User/UserServiceTypes";
import { ClientStore } from "../store";
import { UserContextChangedMessage } from "../../generated/Common/Types/User/UserServiceCRUDTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";

export class UserClient extends BaseClient<UserClientClient> {
    private contextChangeStream: ClientReadableStream<UserContextChangedMessage> | undefined;

    constructor(store: ClientStore) {
        super(store, UserClientClient);
    }

    public async getUserContext(userContextId: string | undefined = this.store.userContextId): Promise<UserContextDescriptor | undefined> {
        if (!userContextId) {
            return undefined;
        }
        return new Promise((resolve, reject) => {
            // idFilter is a required field but seems to be ignored by the server
            // DMXC-3.3.1
            this.client.getUserContext({ idFilter: [], userContextId: userContextId, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.userContext);
            });
        });
    }

    public receiveUserContextChanges(): ClientReadableStream<UserContextChangedMessage> {
        if (!this.contextChangeStream) {
            this.contextChangeStream = this.client.receiveUserContextChanges({ requestId: this.store.createRequestId() });
        }
        return this.contextChangeStream;
    }

    public async bindContext(username: string, passwordHash: string): Promise<UserContextDescriptor> {
        if (this.store.userContextId) {
            throw new Error("User context already set, cannot bind new context");
        }
        return new Promise((resolve, reject) => {
            this.client.bind({ passwordHash, username, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.bindError) {
                    switch (response.bindError) {
                        case UserContextResponse_EBindError.BLOCKED:
                            return reject(new Error("Bind failed: User is blocked"));
                        case UserContextResponse_EBindError.INVALID_CREDENTIALS:
                            return reject(new Error("Bind failed: Invalcredentials"));
                        case UserContextResponse_EBindError.UNRECOGNIZED:
                            return reject(new Error("Bind failed: Unrecognized user"));
                    }
                }
                if (response.error) {
                    return reject(new Error(`Bind failed: ${translateToString(response.error) || "Unknown error"}`));
                }
                this.store.userContextId = response.userContextId!;
                resolve(response.userContextData!);
            });
        });
    }

    public async destroyContext(): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot destroy context");
        }
        return new Promise((resolve, reject) => {
            this.client.destroy({ userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                } else {
                    reject(new Error(translateToString(response.message) || "Failed to destroy user context"));
                }
            });
        });
    }

    public async selectDevicesAndGroups(ids: string[]): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot select devices and groups");
        }
        return new Promise((resolve, reject) => {
            this.client.selectDevicesAndGroups({ idFilter: ids, userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to select devices and groups"));
                }
            });
        });
    }

    public async selectExecutorPage(index: string): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot select executor page");
        }
        return new Promise((resolve, reject) => {
            this.client.selectExecutorPage({ idFilter: [index], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to select executor page"));
                }
            });
        });
    }

    public selectExecutor(index: string): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot select executor");
        }
        return new Promise((resolve, reject) => {
            this.client.selectExecutor({ idFilter: [index], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to select executor"));
                }
            });
        });
    }

    public fixExecutors(ids: string[]): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot fix executors");
        }
        return new Promise((resolve, reject) => {
            this.client.fixExecutors({ idsToFix: ids, idsToUnfix: [], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to fix executors"));
                }
            });
        });
    }

    public unfixExecutors(ids: string[]): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot fix executors");
        }
        return new Promise((resolve, reject) => {
            this.client.fixExecutors({ idsToUnfix: ids, idsToFix: [], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to fix executors"));
                }
            });
        });
    }

    public async selectTimecode(id: string): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot select timecode");
        }
        return new Promise((resolve, reject) => {
            this.client.selectTimecode({ idFilter: [id], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to select timecode"));
                }
            });
        });
    }

    public async selectTrack(id: string): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot select track");
        }
        return new Promise((resolve, reject) => {
            this.client.selectTrack({ idFilter: [id], userContextId: this.store.userContextId!, requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.ok) {
                    resolve();
                }
                else {
                    reject(new Error(translateToString(response.message) || "Failed to select track"));
                }
            });
        });
    }

    public async close() {
        await gracefulStopReadableStream(this.contextChangeStream);
        await super.close();
    }
}