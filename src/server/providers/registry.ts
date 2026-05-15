import { ProviderError } from "./errors";
import type {
  ProviderByCapability,
  ProviderCapability,
  ProviderForCapability,
  ProviderHealthStatus
} from "./types";

type RegisteredProvider<TCapability extends ProviderCapability> = {
  capability: TCapability;
  provider: ProviderForCapability<TCapability>;
};

export class ProviderRegistry {
  private providers = new Map<
    ProviderCapability,
    Map<string, ProviderForCapability<ProviderCapability>>
  >();

  register<TCapability extends ProviderCapability>(
    capability: TCapability,
    provider: ProviderForCapability<TCapability>
  ): this {
    const providersForCapability = this.providers.get(capability) ?? new Map();
    providersForCapability.set(provider.name, provider);
    this.providers.set(capability, providersForCapability);
    return this;
  }

  registerMany(providers: RegisteredProvider<ProviderCapability>[]): this {
    for (const { capability, provider } of providers) {
      this.register(capability, provider);
    }

    return this;
  }

  get<TCapability extends ProviderCapability>(
    capability: TCapability,
    providerName?: string
  ): ProviderForCapability<TCapability> {
    const providersForCapability = this.providers.get(capability);

    if (!providersForCapability || providersForCapability.size === 0) {
      throw new ProviderError(
        `No provider registered for capability: ${capability}`,
        {
          providerName: providerName ?? "unregistered",
          capability,
          code: "PROVIDER_NOT_REGISTERED"
        }
      );
    }

    if (!providerName) {
      return providersForCapability.values().next()
        .value as ProviderByCapability[TCapability];
    }

    const provider = providersForCapability.get(providerName);

    if (!provider) {
      throw new ProviderError(
        `Provider '${providerName}' is not registered for capability: ${capability}`,
        {
          providerName,
          capability,
          code: "PROVIDER_NOT_REGISTERED"
        }
      );
    }

    return provider as ProviderForCapability<TCapability>;
  }

  list(capability?: ProviderCapability): string[] {
    if (capability) {
      return [...(this.providers.get(capability)?.keys() ?? [])];
    }

    return [...this.providers.values()].flatMap((providers) => [
      ...providers.keys()
    ]);
  }

  has(capability: ProviderCapability, providerName?: string): boolean {
    const providersForCapability = this.providers.get(capability);

    if (!providersForCapability) {
      return false;
    }

    return providerName
      ? providersForCapability.has(providerName)
      : providersForCapability.size > 0;
  }

  health(): ProviderHealthStatus[] {
    const checkedAt = new Date();

    return [...this.providers.entries()].flatMap(([capability, providers]) =>
      [...providers.values()].map((provider) => ({
        providerName: provider.name,
        capability,
        state: "unknown",
        checkedAt,
        message: "No active health check configured."
      }))
    );
  }
}
