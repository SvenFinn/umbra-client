import { AudioClientClient } from "../../generated/Client/AudioClient";
import { AudioMetadataDescriptor, ControlPlayerThreadRequest, ControlPlayerThreadRequest_EPlayMode, PlayerThreadChangedMessage, PlayerThreadDescriptor, SoundOutputInfo } from "../../generated/Common/Types/Audio/AudioServiceTypes";
import { BaseClient } from "../baseClient";
import { ClientStore } from "../store";
import { v4 as uuidv4 } from "uuid";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientReadableStream } from "@grpc/grpc-js";


//TODO: This does not work currently
export class AudioClient extends BaseClient {
    private client: AudioClientClient;
    private changeStream: ClientReadableStream<PlayerThreadChangedMessage> | undefined;

    constructor(store: ClientStore) {
        super(store);
        this.client = new AudioClientClient(store.connectionString!, store.credentials!);
    }

    public async getPlayers(ids: string[] = []): Promise<PlayerThreadDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get player threads");
        }
        return new Promise((resolve, reject) => {
            this.client.getPlayerThreads({ idFilter: ids, requestId: this.store.createRequestId(), userContextId: this.store.userContextId! }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.playerThreads);
            });
        });
    }

    public async getAudioMetadata(ids: string[] = []): Promise<AudioMetadataDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get audio metadata");
        }
        return new Promise((resolve, reject) => {
            this.client.requestAllAudioMetadata({ requestId: this.store.createRequestId(), userContextId: this.store.userContextId!, idFilter: ids }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.audioMetadata);
            });
        });
    }

    public async getSoundOutputs(): Promise<SoundOutputInfo[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get sound output infos");
        }
        return new Promise((resolve, reject) => {
            this.client.requestAllSoundOutputInfos({ requestId: this.store.createRequestId(), userContextId: this.store.userContextId!, idFilter: [] }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.soundOutputInfos);
            });
        });
    }

    public async getSoundOutput(outputId: string): Promise<SoundOutputInfo | undefined> {
        const outputs = await this.getSoundOutputs();
        return outputs.find(o => o.guid === outputId);
    }

    private async controlPlayer(playerThreadId: string, request: Partial<ControlPlayerThreadRequest>): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.controlPlayerThread({
                requestId: this.store.createRequestId(),
                playerThreadId: playerThreadId,
                audioFile: "",
                playMode: ControlPlayerThreadRequest_EPlayMode.None,
                balance: 0,
                balanceSet: false,
                volume: 0,
                volumeSet: false,
                time: "",
                timeSet: false,
                soundOutputInfo: undefined,
                soundOutputInfoSet: false,
                ...request
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to control player thread"));
                }
                resolve(playerThreadId);
            });
        });
    }


    public async playAudioFile(audioFile: string, outputId?: string): Promise<string> {
        const output = outputId ? await this.getSoundOutput(outputId) : undefined;
        return this.controlPlayer(uuidv4(), {
            audioFile: audioFile,
            playMode: ControlPlayerThreadRequest_EPlayMode.Play,
            soundOutputInfo: output,
            soundOutputInfoSet: output ? true : false,
        });
    }

    public async pausePlayer(playerId: string): Promise<string> {
        return this.controlPlayer(playerId, {
            playMode: ControlPlayerThreadRequest_EPlayMode.Pause
        });
    }

    public async stopPlayer(playerId: string): Promise<string> {
        return this.controlPlayer(playerId, {
            playMode: ControlPlayerThreadRequest_EPlayMode.Stop
        });
    }

    public async setVolume(playerId: string, volume: number): Promise<string> {
        return this.controlPlayer(playerId, {
            volume,
            volumeSet: true
        });
    }

    // This does not work properly, balance is always 0
    // public async setBalance(playerId: string, balance: number): Promise<string> {
    //     return this.controlPlayer(playerId, {
    //         balance,
    //         balanceSet: true
    //     });
    // }

    public async setPlaybackTime(playerId: string, time: BigInt): Promise<string> {
        return this.controlPlayer(playerId, {
            time: time.toString(),
            timeSet: true
        });
    }

    public receivePlayerUpdates(): ClientReadableStream<PlayerThreadChangedMessage> {
        if (!this.changeStream) {
            this.changeStream = this.client.receivePlayerThreadChanges({ requestId: this.store.createRequestId() }, this.store.getMetadata());
        }
        return this.changeStream;
    }

    public async stopAllPlayers(): Promise<void> {
        const threads = await this.getPlayers();
        await Promise.all(threads.map(t => this.stopPlayer(t.id)));
    }

    public async close() {
        await gracefulStopReadableStream(this.changeStream);
        this.client.close();
    }
}