"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SnapStore } from "@/app/api/stores/types";

interface NearbyStoresMapProps {
  stores: SnapStore[];
}

const STORE_TYPE_COLORS: Record<string, string> = {
  "Super Store": "#16a34a",
  Supermarket: "#2563eb",
  "Convenience Store": "#d97706",
  "Farmers' Market": "#7c3aed",
  Other: "#6b7280",
};

function getColor(storeType: string): string {
  return STORE_TYPE_COLORS[storeType] ?? STORE_TYPE_COLORS.Other;
}

function createPinSvg(color: string, isIncentive: boolean): string {
  const sparkle = isIncentive
    ? `<circle cx="12" cy="10" r="3.5" fill="white"/><text x="12" y="12.5" text-anchor="middle" font-size="7" fill="${color}">★</text>`
    : `<circle cx="12" cy="10" r="3" fill="white"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    ${sparkle}
  </svg>`;
}

function createIcon(store: SnapStore): L.DivIcon {
  const color = getColor(store.storeType);
  const svg = createPinSvg(color, store.healthyIncentives);

  return L.divIcon({
    html: svg,
    className: "snap-store-marker",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -34],
  });
}

export default function NearbyStoresMap({ stores }: NearbyStoresMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || stores.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const validStores = stores.filter(
      (s) => s.latitude !== 0 && s.longitude !== 0,
    );

    if (validStores.length === 0) return;

    const avgLat =
      validStores.reduce((sum, s) => sum + s.latitude, 0) / validStores.length;
    const avgLng =
      validStores.reduce((sum, s) => sum + s.longitude, 0) /
      validStores.length;

    const map = L.map(mapRef.current, {
      center: [avgLat, avgLng],
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    validStores.forEach((store) => {
      const marker = L.marker([store.latitude, store.longitude], {
        icon: createIcon(store),
      }).addTo(map);

      const incentiveBadge = store.healthyIncentives
        ? `<span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;padding:1px 6px;border-radius:9999px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;margin-top:4px;">★ Healthy Incentives</span>`
        : "";

      marker.bindPopup(
        `<div style="min-width:180px;font-family:system-ui,sans-serif;">
          <p style="font-weight:600;font-size:13px;margin:0 0 2px;">${store.name}</p>
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">${store.address}, ${store.city}, ${store.state} ${store.zip}</p>
          <span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:9999px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;">${store.storeType}</span>
          ${incentiveBadge}
        </div>`,
        { closeButton: true, maxWidth: 260 },
      );

      bounds.extend([store.latitude, store.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [stores]);

  if (stores.length === 0) return null;

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full rounded-lg border border-border/70 overflow-hidden"
        style={{ height: 360 }}
      />
      <div className="flex flex-wrap items-center gap-3 px-1">
        {Object.entries(STORE_TYPE_COLORS).map(([type, color]) => {
          const count = stores.filter((s) => s.storeType === type).length;
          if (count === 0) return null;
          return (
            <div key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {type} ({count})
            </div>
          );
        })}
        {stores.some((s) => s.healthyIncentives) && (
          <div className="flex items-center gap-1 text-[11px] text-green-700">
            <span>★</span> Healthy Incentives
          </div>
        )}
      </div>
    </div>
  );
}
