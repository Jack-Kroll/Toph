import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { latitude: number; longitude: number };

type Props = {
  /** Where to center the view. The map re-centers only when this changes. */
  center: LatLng;
  /** Pin position; defaults to the center. Null hides the pin. */
  marker?: LatLng | null;
  zoom?: number;
  /** Makes the map a picker: clicking moves the pin. */
  onPick?: (point: LatLng) => void;
  className?: string;
  label: string;
};

// Esri World Imagery needs no API key; attribution is required.
const TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ATTRIBUTION =
  "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// Matches the blue location dot in the design.
const PIN_STYLE: L.CircleMarkerOptions = {
  radius: 7,
  color: "#ffffff",
  weight: 3,
  fillColor: "#3b82f6",
  fillOpacity: 1,
};

export default function SatelliteMap({
  center,
  marker,
  zoom = 16,
  onPick,
  className = "",
  label,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.CircleMarker | null>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(
      instance,
    );
    instance.on("click", (event) =>
      pick.current?.({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      }),
    );
    // Dialogs and expanding rows size the container after mount.
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    map.current = instance;
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      pin.current = null;
    };
  }, []);

  useEffect(() => {
    map.current?.setView([center.latitude, center.longitude], zoom);
  }, [center.latitude, center.longitude, zoom]);

  const point = marker === undefined ? center : marker;
  const pinLat = point?.latitude ?? null;
  const pinLng = point?.longitude ?? null;
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (pinLat === null || pinLng === null) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    const position: L.LatLngTuple = [pinLat, pinLng];
    if (pin.current) pin.current.setLatLng(position);
    else pin.current = L.circleMarker(position, PIN_STYLE).addTo(instance);
  }, [pinLat, pinLng]);

  return (
    <div
      ref={container}
      className={`satellite-map ${onPick ? "picking" : ""} ${className}`}
      role="application"
      aria-label={label}
    />
  );
}
