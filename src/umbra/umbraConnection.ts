import {
    ClientServiceClient,
    ConnectedClientServiceClient,
} from '../generated/Common/UmbraClientService';
import {
    UmbraLoginRequest,
    UmbraLoginResponse,
    UmbraLoginResponse_EReturnCode,
    UmbraLogoffRequest,
    ClientProgramInfo,
} from '../generated/Common/Types/UmbraServiceTypes';
import {
    status as grpcStatus,
    Metadata,
    ChannelCredentials,
    ServiceError
} from '@grpc/grpc-js';
import { UmbraDiscoveryClient } from './umbraDiscovery';
import { ClientInfoStore } from '../ClientInfo';
import { checkValidIp } from './ip';
import { EventEmitter } from 'stream';

export class LoginException extends Error {
    public readonly returnCode: UmbraLoginResponse_EReturnCode;
    public readonly sessionID?: string;

    constructor(message: string, returnCode: UmbraLoginResponse_EReturnCode, sessionId?: string) {
        super(message);
        this.name = 'LoginException';
        this.returnCode = returnCode;
        this.sessionID = sessionId;
    }
}

export class UmbraConnectionClient extends EventEmitter {

    private clientInfoStore: ClientInfoStore;

    private sessionId: string | undefined;
    private umbraInfo: ClientProgramInfo | undefined;
    private clientService: ClientServiceClient | undefined;
    private connectedClientService: ConnectedClientServiceClient | undefined;

    private connectionString: string | undefined;

    connections: Object[] = [];

    constructor(clientInfoStore: ClientInfoStore) {
        super();
        this.clientInfoStore = clientInfoStore;
    }

    public async login(umbraServerName: string): Promise<void> {
        const discoveryClient = new UmbraDiscoveryClient();
        const candidate = await discoveryClient.getUmbraServerInfo(umbraServerName) || undefined;
        discoveryClient.close();
        if (!candidate) {
            throw new Error(`Umbra server "${umbraServerName}" not found via discovery.`);
        }

        const selectedIP = await checkValidIp(candidate.clientInfo?.ips || [], candidate.clientInfo?.umbraPort || 0);
        if (!selectedIP) {
            throw new Error(`No reachable IP found for Umbra server "${umbraServerName}".`);
        }

        this.connectionString = `${selectedIP}:${candidate.clientInfo?.umbraPort}`;

        const client = new ClientServiceClient(this.connectionString, ChannelCredentials.createInsecure());

        const request: UmbraLoginRequest = {
            client: this.clientInfoStore.getClientProgramInfo(),
        };


        try {
            // Use promisified version with proper callback handling
            const response = await new Promise<UmbraLoginResponse>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Timeout'));
                }, 3000);

                client.login(request, (error: ServiceError | null, result: UmbraLoginResponse) => {
                    clearTimeout(timeoutId);
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            });

            switch (response.returnCode) {
                case UmbraLoginResponse_EReturnCode.NoError:
                case UmbraLoginResponse_EReturnCode.AlreadyLoggedIn:
                    break;
                default:
                    throw new LoginException(response.message, response.returnCode, response.sessionId);
            }

            this.sessionId = response.sessionId;
            this.umbraInfo = response.umbraServer;

            this.clientInfoStore.setUmbraInfo(this.umbraInfo?.clientInfo);
            this.clientService = client;

            await this.createConnectedClientService();

            this.emit("connected")

        } catch (error: any) {
            this.connectionString = undefined;
            if (error.code === grpcStatus.PERMISSION_DENIED) {
                throw new LoginException(error.message, UmbraLoginResponse_EReturnCode.AccessDenied);
            } else {
                throw new LoginException(error.message, UmbraLoginResponse_EReturnCode.Error);
            }
        }
    }

    private async createConnectedClientService() {
        if (!this.connectionString) {
            throw new Error("Not connected to Umbra server");
        }
        this.connectedClientService = new ConnectedClientServiceClient(this.connectionString, ChannelCredentials.createInsecure());
        return new Promise<void>((resolve, reject) => {
            this.connectedClientService?.reportReadyToWork({
                state: {
                    readyToWork: true,
                    receiveAndDisplayMessages: true
                }
            }, this.getMetadata(), (error: ServiceError | null) => {
                if (error) {
                    reject(error);
                }
                resolve();
            });
        });
    }

    public getMetadata(): Metadata {
        const metadata = new Metadata();
        if (this.sessionId) {
            metadata.set('sessionID', this.sessionId);
        }
        return metadata;
    }

    public getConnectionString(): string | undefined {
        return this.connectionString;
    }

    public getUmbraInfo(): ClientProgramInfo | undefined {
        return this.umbraInfo;
    }

    public getClientService(): ClientServiceClient | undefined {
        return this.clientService;
    }

    public getConnectedClientService(): ConnectedClientServiceClient | undefined {
        return this.connectedClientService;
    }

    public connected(): boolean {
        return this.sessionId !== undefined && this.clientService !== undefined && this.connectedClientService !== undefined;
    }

    public async disconnect(): Promise<void> {
        if (this.clientService && this.sessionId) {
            const request: UmbraLogoffRequest = {
                sessionId: this.sessionId,
                client: this.clientInfoStore.getClientProgramInfo(),
            };

            try {
                await new Promise<void>((resolve, reject) => {
                    this.clientService!.logoff(request, this.getMetadata(), (error: ServiceError | null) => {
                        resolve();
                    });
                });
            } catch (error) {
                // Ignore errors during logoff
            }
        }

        this.sessionId = undefined;
        this.clientService?.close();
        this.clientService = undefined;
        this.connectedClientService?.close();
        this.connectedClientService = undefined;
        this.clientInfoStore.setUmbraInfo(undefined);
        this.emit("disconnected");
    }
}