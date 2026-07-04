// Copy to src/components/miso/MisoConnectorGate.tsx.
import type { ReactNode } from "react";

import {
  type MisoConnectorItem,
  useMisoExternalConnectors,
} from "@/lib/miso-sdk/miso-connectors";

interface MisoConnectorGateProps {
  connectorIds: string[];
  children: ReactNode;
}

export function MisoConnectorGate({ connectorIds, children }: MisoConnectorGateProps) {
  const { connectors, initialized, loading, error, connect } = useMisoExternalConnectors();
  const connectorById = new Map(connectors.map((connector) => [connector.connectorId, connector]));
  const requiredUnavailable = connectorIds.filter((connectorId) => !connectorById.has(connectorId));
  const requiredMissing = connectorIds
    .map((connectorId) => connectorById.get(connectorId))
    .filter(
      (connector): connector is MisoConnectorItem =>
        !!connector && connector.status !== "connected",
    );

  if (initialized && !loading && requiredUnavailable.length === 0 && requiredMissing.length === 0) {
    return <>{children}</>;
  }

  return (
    <section aria-label="Connect required accounts">
      {requiredMissing.map((connector) => (
        <button
          key={connector.connectorId}
          type="button"
          disabled={loading}
          onClick={() => connect(connector.connectorId)}
        >
          Connect {connector.name}
        </button>
      ))}
      {initialized && requiredUnavailable.length > 0 ? (
        <p role="alert">
          Required connector is not available: {requiredUnavailable.join(", ")}
        </p>
      ) : null}
      {loading ? <p>Checking connections...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
