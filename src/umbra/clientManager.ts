import { ClientStore } from "./store";
import { UmbraDiscoveryClient } from "./clients/umbraDiscovery";
import { checkValidIp } from "./helpers/ip";
import { ClientService } from "./clients/clientService";
import { ConnectedClientService } from "./clients/connectedClientService";
import { UserClient } from "./clients/userClient";
import { BaseClient } from "./baseClient";
import { AffinityClient } from "./clients/affinityClient";
import { AttachableClient } from "./clients/attachableClient";
import { AudioClient } from "./clients/audioClient";
import { MacroBoardClient } from "./clients/macroBoardClient";
import { BackgroundTaskClient } from "./clients/backgroundTaskClient";
import { CueClient } from "./clients/cueClient";
import { CueListClient } from "./clients/cueListClient";
import { UserContextDescriptor } from "../generated/Common/Types/User/UserServiceTypes";

export class ClientManager {
    private clients: Map<string, any> = new Map();
    private store: ClientStore;
    private discoveryClient: UmbraDiscoveryClient;

    constructor(store: ClientStore) {
        this.store = store;
        this.discoveryClient = new UmbraDiscoveryClient();
    }

    public async login(umbraServerName: string, userName: string = "DMXCDefault", password: string = "DMXCDefault"): Promise<UserContextDescriptor | undefined> {
        if (!this.store.connectionString) {
            const candidate = await this.discoveryClient.getUmbraInfo(umbraServerName);
            if (!candidate || !candidate.clientInfo) {
                throw new Error(`Umbra server ${umbraServerName} not found`);
            }
            const ip = await checkValidIp(candidate.clientInfo.ips, candidate.clientInfo.umbraPort);
            if (!ip) {
                throw new Error(`No valid IP found for Umbra server ${umbraServerName}, tried: ${candidate.clientInfo.ips.join(", ")}`);
            }
            this.store.connectionString = `${ip}:${candidate.clientInfo.umbraPort}`;
        }
        if (!this.store.sessionId) {
            await this.clientService?.login();
        }
        await this.connectedClientService?.reportReadyToWork(true, true);
        return await this.userClient?.bindContext(userName, password);
    }

    private createClient<T extends BaseClient>(cls: new (store: ClientStore) => T): T | undefined {
        if (!this.store.connectionString) {
            return undefined;
        }
        const key = cls.name;
        if (this.clients.has(key)) {
            return this.clients.get(key);
        }
        const client = new cls(this.store);
        this.clients.set(key, client);
        return client;
    }

    public async close() {
        for (const client of this.clients.values()) {
            try {
                await client.close();
            } catch { /* ignore */ }
        }
        this.clients.clear();
        this.discoveryClient.close();
    }

    public get affinityClient(): AffinityClient | undefined {
        return this.createClient(AffinityClient);
    }

    public get attachableClient(): AttachableClient | undefined {
        return this.createClient(AttachableClient);
    }

    public get audioClient(): AudioClient | undefined {
        return this.createClient(AudioClient);
    }

    public get backgroundTaskClient(): BackgroundTaskClient | undefined {
        return this.createClient(BackgroundTaskClient);
    }

    public get clientService(): ClientService | undefined {
        return this.createClient(ClientService);
    }

    public get connectedClientService(): ConnectedClientService | undefined {
        return this.createClient(ConnectedClientService);
    }

    // Can't currently test this, needs cueListClient
    public get cueClient(): CueClient | undefined {
        return this.createClient(CueClient);
    }

    public get cueListClient(): CueListClient | undefined {
        return this.createClient(CueListClient);
    }

    public get macroBoardClient(): MacroBoardClient | undefined {
        return this.createClient(MacroBoardClient);
    }

    public get userClient(): UserClient | undefined {
        return this.createClient(UserClient);
    }

}