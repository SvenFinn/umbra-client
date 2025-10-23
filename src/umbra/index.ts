import { Metadata, ChannelCredentials } from "@grpc/grpc-js";
import { DMXClientClient } from "../generated/Client/DMXClient";
import { EventEmitter } from "stream";
import { ClientInfoStore } from "../ClientInfo";
import { UmbraConnectionClient } from "./umbraConnection";
import { UmbraPing } from "./umbraPing";
import { UmbraBroadcast } from "./umbraBroadcast";
import { UmbraClientsInfo } from "./umbraClientsInfo";
import { ClientProgramInfo, ProgramInfo } from "../generated/Common/Types/UmbraServiceTypes";
import { BroadcastMessage } from "../generated/Common/Types/BroadcastServiceTypes";
import { AffinityClientClient } from "../generated/Client/AffinityClient";
import { AttachableClientClient } from "../generated/Client/AttachableClient";
import { AudioClientClient } from "../generated/Client/AudioClient";
import { BackgroundTaskClientClient } from "../generated/Client/BackgroundTaskClient";
import { CuelistClientClient } from "../generated/Client/CuelistClient";
import { CueClientClient } from "../generated/Client/CueClient";
import { BeatClientClient } from "../generated/Client/BeatClient";
import { CueTriggerClientClient } from "../generated/Client/CueTriggerClient";
import { DeviceClientClient } from "../generated/Client/DeviceClient";
import { DMXInterfaceManagementClientClient } from "../generated/Client/DMXInterfaceManagementClient";
import { ElectricityClientClient } from "../generated/Client/ElectricityClient";
import { ExecutorClientClient } from "../generated/Client/ExecutorClient";
import { FannedValueClientClient } from "../generated/Client/FannedValueClient";
import { InputClientClient } from "../generated/Client/InputClient";
import { ItemListClientClient } from "../generated/Client/ItemListClient";
import { LogClientClient } from "../generated/Client/LogClient";
import { MacroBoardClientClient } from "../generated/Client/MacroBoardClient";
import { MacroClientClient } from "../generated/Client/MacroClient";
import { MainSwitchClientClient } from "../generated/Client/MainSwitchClient";
import { MasterClientClient } from "../generated/Client/MasterClient";
import { MonitoringClientClient } from "../generated/Client/MonitoringClient";
import { ParameterClientClient } from "../generated/Client/ParameterClient";
import { PluginManagementClientClient } from "../generated/Client/PluginManagementClient";
import { PresetClientClient } from "../generated/Client/PresetClient";
import { ProgrammerClientClient } from "../generated/Client/ProgrammerClient";
import { ProjectClientClient } from "../generated/Client/ProjectClient";
import { RDMClientClient } from "../generated/Client/RDMClient";
import { SettingsClientClient } from "../generated/Client/SettingsClient";
import { StageViewClientClient } from "../generated/Client/StageviewClient";
import { TimecodeClientClient } from "../generated/Client/TimecodeClient";
import { UserClientClient } from "../generated/Client/UserClient";


export class DMXControlClient extends EventEmitter {
    // This class is a wrapper around the umbra client
    // It also provides methods for getting the individual subclients
    // And umbra

    private umbraConnection: UmbraConnectionClient;
    private clientInfoStore: ClientInfoStore;

    private umbraPing: UmbraPing;
    private umbraBroadcast: UmbraBroadcast;
    private umbraClientsInfo: UmbraClientsInfo;


    constructor(clientName: string, clientInfo: ProgramInfo) {
        super();

        this.clientInfoStore = new ClientInfoStore(clientInfo, clientName);
        this.umbraConnection = new UmbraConnectionClient(this.clientInfoStore);

        this.umbraPing = new UmbraPing(this.umbraConnection, this.clientInfoStore);
        this.umbraBroadcast = new UmbraBroadcast(this.umbraConnection, this.clientInfoStore);
        this.umbraClientsInfo = new UmbraClientsInfo(this.umbraConnection);

        this.umbraConnection.on("connected", () => {
            this.emit("connected");
        });
        this.umbraConnection.on("disconnected", () => {
            this.emit("disconnected");
        });
        this.umbraBroadcast.on("broadcast", (msg) => {
            this.emit("broadcast", msg);
        });
        this.umbraClientsInfo.on("clientChange", (change) => {
            this.emit("clientChange", change);
        });
    }

    public async sendBroadcastMessage(message: BroadcastMessage): Promise<void> {
        return this.umbraBroadcast.sendBroadcastMessage(message);
    }

    public getClients(): ClientProgramInfo[] {
        return this.umbraClientsInfo.getClients();
    }

    public getClientByRuntimeId(runtimeId: string): ClientProgramInfo | undefined {
        return this.umbraClientsInfo.getClientByRuntimeId(runtimeId);
    }

    public async login(serverName: string, userName: string, passwordHash: string): Promise<void> {
        return this.umbraConnection.login(serverName, userName, passwordHash);
    }

    public async disconnect(): Promise<void> {
        return this.umbraConnection.disconnect();
    }

    public isConnected(): boolean {
        return this.umbraConnection.connected();
    }

    public getMetadata(): Metadata {
        return this.umbraConnection.getMetadata();
    }

    public getRuntimeId(): string {
        return this.clientInfoStore.getClientProgramInfo().clientInfo?.runtimeid || "";
    }

    public getUserContextId(): string | undefined {
        return this.clientInfoStore.getUserContextId();
    }

    public getConnectionString(): string | undefined {
        return this.umbraConnection.getConnectionString();
    }

    public get affinity(): AffinityClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new AffinityClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get attachables(): AttachableClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new AttachableClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get audio(): AudioClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new AudioClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get backGroundTasks(): BackgroundTaskClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new BackgroundTaskClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get beats(): BeatClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new BeatClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get cues(): CueClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new CueClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get cueLists(): CuelistClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new CuelistClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get cueTriggers(): CueTriggerClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new CueTriggerClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get devices(): DeviceClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new DeviceClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get dmx(): DMXClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new DMXClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get dmxInterfaceManagement(): DMXInterfaceManagementClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new DMXInterfaceManagementClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get electricity(): ElectricityClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ElectricityClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get executors(): ExecutorClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ExecutorClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get fannedValues(): FannedValueClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new FannedValueClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get inputAssignment(): InputClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new InputClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get itemLists(): ItemListClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ItemListClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get log(): LogClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new LogClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get macroBoards(): MacroBoardClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new MacroBoardClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get macros(): MacroClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new MacroClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get mainSwitch(): MainSwitchClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new MainSwitchClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get masters(): MasterClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new MasterClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get monitoring(): MonitoringClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new MonitoringClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get parameters(): ParameterClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ParameterClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get pluginManagement(): PluginManagementClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new PluginManagementClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get presets(): PresetClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new PresetClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get programmer(): ProgrammerClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ProgrammerClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get projects(): ProjectClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new ProjectClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get rdm(): RDMClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new RDMClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get settings(): SettingsClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new SettingsClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get stageViews(): StageViewClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new StageViewClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get timecode(): TimecodeClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new TimecodeClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }

    public get user(): UserClientClient | undefined {
        if (!this.umbraConnection.connected()) {
            return undefined;
        }
        return new UserClientClient(this.umbraConnection.getConnectionString() || "", ChannelCredentials.createInsecure());
    }
}