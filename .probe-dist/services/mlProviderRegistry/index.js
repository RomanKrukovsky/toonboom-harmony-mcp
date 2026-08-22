export class MlProviderRegistry {
    providers = new Map();
    register(provider) {
        if (this.providers.has(provider.id)) {
            throw new Error(`Provider ${provider.id} is already registered`);
        }
        this.providers.set(provider.id, provider);
    }
    get(id) {
        return this.providers.get(id);
    }
    getAll() {
        return Array.from(this.providers.values());
    }
}
