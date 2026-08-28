import { useEffect, useRef, useState } from "react";
import {
  getListingWithSeller,
  getMarketplaceEntities,
  getPublicProfile,
  getSellerProfileById,
  getStoreProfile,
} from "../lib/api/entities";
import { getMarketplaceDiscovery, getMapLocations } from "../lib/api/discovery";

function useResolved(load, key) {
  const [value, setValue] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setValue(null);
    if (!key) return () => { cancelled = true; };

    Promise.resolve(loadRef.current())
      .then((nextValue) => {
        if (!cancelled) setValue(nextValue);
      })
      .catch((error) => {
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return value;
}

export function useResolvedSeller(sellerId) {
  return useResolved(() => getSellerProfileById(sellerId), sellerId);
}

export function useResolvedListingWithSeller(listing) {
  const listingKey = typeof listing === "object" ? listing?.databaseId ?? listing?.id ?? listing?.legacyId : listing;
  return useResolved(() => getListingWithSeller(listing), listingKey);
}

export function useResolvedStoreProfile(sellerId) {
  return useResolved(() => getStoreProfile(sellerId), sellerId);
}

export function useResolvedPublicProfile(userId) {
  return useResolved(() => getPublicProfile(userId), userId);
}

export function useResolvedMarketplaceEntities(options = {}) {
  const key = `${options.includeEvents !== false}:${options.includeMapLocations !== false}`;
  const [entities, setEntities] = useState(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    setEntities(null);
    getMarketplaceEntities(optionsRef.current)
      .then((nextEntities) => {
        if (!cancelled) setEntities(nextEntities);
      })
      .catch((error) => {
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return entities;
}

export function useMarketplaceDiscovery() {
  const [discovery, setDiscovery] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getMarketplaceDiscovery()
      .then((nextDiscovery) => {
        if (!cancelled) setDiscovery(nextDiscovery);
      })
      .catch((error) => {
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return discovery;
}

export function useMapLocations() {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getMapLocations()
      .then((nextMap) => {
        if (!cancelled) setMap(nextMap);
      })
      .catch((error) => {
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return map;
}
