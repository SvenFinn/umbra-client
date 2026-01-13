import { ChannelCredentials, Client, ClientOptions, InterceptingCall, Interceptor, Metadata, Listener } from "@grpc/grpc-js";
import { ClientStore } from "./store";


export const sessionInterceptor = (store: ClientStore): Interceptor =>
    (options, nextCall) =>
        new InterceptingCall(nextCall(options), {
            start(metadata: Metadata, listener: Listener, next) {
                const md = metadata.clone();

                const sessionId = store.sessionId;
                if (sessionId) {
                    md.set("sessionID", sessionId);
                }

                next(md, listener);
            },
        });


export class BaseClient<T extends Client> {
    protected store: ClientStore;
    protected client: T;

    constructor(clientStore: ClientStore, ClientConstructor: new (address: string, credentials: ChannelCredentials, options?: ClientOptions) => T) {
        this.store = clientStore;
        this.client = new ClientConstructor(
            clientStore.connectionString!,
            clientStore.credentials!,
            {
                interceptors: [
                    sessionInterceptor(this.store),
                ],
            }
        );
    };

    public async close() {
        this.client.close();
    }
}