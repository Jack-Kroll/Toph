import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

// Leaflet loads only when a live map is shown, so demo visitors never download it.
const SatelliteMap = lazy(() => import("./SatelliteMap"));

export function LazySatelliteMap(props: ComponentProps<typeof SatelliteMap>) {
  return (
    <Suspense
      fallback={
        <div
          className={`satellite-map loading ${props.className ?? ""}`}
          aria-busy="true"
          aria-label={props.label}
        />
      }
    >
      <SatelliteMap {...props} />
    </Suspense>
  );
}
