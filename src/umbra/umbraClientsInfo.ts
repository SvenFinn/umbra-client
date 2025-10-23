import { ChannelCredentials, ClientReadableStream } from "@grpc/grpc-js";
import { ClientProgramInfo, UmbraClientInfoMessage, UmbraNetworkInfoResponse } from "../generated/Common/Types/UmbraServiceTypes";
import { UmbraConnectionClient } from "./umbraConnection";
import { EventEmitter } from "stream";
import { randomUUID } from "crypto";
import { DMXCNetServiceClient } from "../generated/Common/UmbraClientService";


export class UmbraClientsInfo extends EventEmitter {
    private umbraConnection: UmbraConnectionClient;

    private clients: Map<string, ClientProgramInfo> = new Map();

    private channel: ClientReadableStream<UmbraClientInfoMessage> | undefined;

    constructor(umbraConnection: UmbraConnectionClient) {
        super();
        this.umbraConnection = umbraConnection;
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
    private async connect() {
        const client = this.umbraConnection.getConnectedClientService();
        if (!client) {
            return;
        }
        await this.getClientsInternal();
        this.channel = client.receiveClientChanges({ requestId: randomUUID() }, this.umbraConnection.getMetadata());
        this.channel.on("data", (msg: UmbraClientInfoMessage) => {
            const isLogin = msg.login === true;
            const info = msg.client;
            if (!info) {
                return;
            }
            const runtimeId = info.clientInfo?.runtimeid;
            if (!runtimeId) {
                return;
            }
            if (isLogin) {
                this.clients.set(runtimeId, info);
            }
            else {
                this.clients.delete(runtimeId);
            }
            this.emit("clientChange", { login: isLogin, client: info });
        });
    }

    private async getClientsInternal(): Promise<void> {
        if (!this.umbraConnection.connected()) {
            return;
        }
        const dmxCNetClient = new DMXCNetServiceClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
        const clients = await new Promise<ClientProgramInfo[]>((resolve, reject) => {
            dmxCNetClient.getUmbraNetworkInfo({ requestId: randomUUID() }, this.umbraConnection.getMetadata(), (error, response: UmbraNetworkInfoResponse) => {
                if (error) {
                    reject(error);
                }
                else {
                    if (!response.umbraServer) {
                        resolve([]);
                        return;
                    }
                    resolve([response.umbraServer, ...response.connectedClients]);
                }
            });
        });
        this.clients.clear();
        for (const client of clients) {
            const runtimeId = client.clientInfo?.runtimeid;
            if (runtimeId) {
                this.clients.set(runtimeId, client);
            }
        }
    }

    public getClients(): ClientProgramInfo[] {
        return Array.from(this.clients.values());
    }

    public getClientByRuntimeId(runtimeId: string): ClientProgramInfo | undefined {
        return this.clients.get(runtimeId);
    }
}