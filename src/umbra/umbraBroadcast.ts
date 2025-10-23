import { ClientDuplexStream } from "@grpc/grpc-js";
import { ClientInfoStore } from "../ClientInfo";
import { UmbraConnectionClient } from "./umbraConnection";
import { EventEmitter } from "stream";
import { BroadcastMessage } from "../generated/Common/Types/BroadcastServiceTypes";


export class UmbraBroadcast extends EventEmitter {
    private umbraConnection: UmbraConnectionClient;
    private clientInfoStore: ClientInfoStore;

    private channel: ClientDuplexStream<BroadcastMessage, BroadcastMessage> | undefined;

    constructor(umbraConnection: UmbraConnectionClient, clientInfoStore: ClientInfoStore) {
        super();
        this.umbraConnection = umbraConnection;
        this.clientInfoStore = clientInfoStore;
        this.umbraConnection.on("connected", () => {
            this.connect();
        });
        this.umbraConnection.on("disconnected", () => {
            this.channel = undefined;
        });

        if (this.umbraConnection.connected()) {
            this.connect();
        }
    }

    public async sendBroadcastMessage(message: BroadcastMessage): Promise<void> {
        if (!this.channel) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.channel?.write({
                ...message,
                senderName: this.clientInfoStore.getClientProgramInfo().clientInfo?.clientname || "",
            }, (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    private connect() {
        const client = this.umbraConnection.getConnectedClientService();
        if (!client) {
            return;
        }
        this.channel = client.sendBroadcast(this.umbraConnection.getMetadata());
        this.channel.on("data", (msg: BroadcastMessage) => {
            if (msg.senderName !== this.clientInfoStore.getClientProgramInfo().clientInfo?.clientname) {
                console.log("Received broadcast", msg);
                this.emit("broadcast", msg);
            }
        });
    }
}