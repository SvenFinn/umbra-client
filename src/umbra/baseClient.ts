import { ClientStore } from "./store";

export class BaseClient {
    protected store: ClientStore;

    constructor(clientStore: ClientStore) {
        this.store = clientStore;
    };

    public async close() {
        console.error("BaseClient close() called - should be overridden in subclass");
    }

}