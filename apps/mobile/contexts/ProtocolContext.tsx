import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeProtocol } from '@protocol/shared/schemas';
import type { DailyProtocol, Critique } from '@protocol/shared/schemas';

export type ProtocolChain = {
  id: string;
  name: string | null;
  version_chain_id: string;
};

export type ProtocolVersion = {
  id: string;
  version: number;
  name: string | null;
  protocol_data: unknown;
  verified: boolean;
  weighted_goal_score: number | null;
  viability_score: number | null;
  version_chain_id: string;
  created_at: string;
  change_source: string | null;
  change_note: string | null;
  critiques: Critique[] | null;
};

type ProtocolContextType = {
  // Protocol chains (list of unique protocols)
  chains: ProtocolChain[];
  isLoadingChains: boolean;

  // Selected chain and version
  selectedChain: ProtocolChain | null;
  selectedVersion: ProtocolVersion | null;
  parsedProtocol: DailyProtocol | null;

  // Selection functions
  selectChain: (chain: ProtocolChain) => void;
  selectVersion: (version: ProtocolVersion) => void;

  // Refresh functions
  refreshChains: () => Promise<void>;
  refreshVersions: () => Promise<void>;

  // Versions of selected chain
  versions: ProtocolVersion[];
  isLoadingVersions: boolean;

  // Update functions for local state
  updateSelectedChain: (updates: Partial<ProtocolChain>) => void;
  updateSelectedVersion: (updates: Partial<ProtocolVersion>) => void;
  setChains: React.Dispatch<React.SetStateAction<ProtocolChain[]>>;
};

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // State
  const [chains, setChains] = useState<ProtocolChain[]>([]);
  const [selectedChain, setSelectedChain] = useState<ProtocolChain | null>(null);
  const [versions, setVersions] = useState<ProtocolVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ProtocolVersion | null>(null);
  const [parsedProtocol, setParsedProtocol] = useState<DailyProtocol | null>(null);

  const [isLoadingChains, setIsLoadingChains] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Fetch chains
  const fetchChains = useCallback(async () => {
    if (!user) {
      setChains([]);
      setSelectedChain(null);
      setIsLoadingChains(false);
      return;
    }

    setIsLoadingChains(true);

    const { data, error } = await supabase
      .from('protocols')
      .select('id, name, version_chain_id')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
      setIsLoadingChains(false);
      return;
    }

    if (data && data.length > 0) {
      setChains(data);
      // Select first chain if none selected or current selection no longer exists
      if (!selectedChain || !data.find(c => c.version_chain_id === selectedChain.version_chain_id)) {
        setSelectedChain(data[0]);
      }
    } else {
      setChains([]);
      setSelectedChain(null);
    }

    setIsLoadingChains(false);
  }, [user, selectedChain]);

  // Fetch versions when chain changes
  const fetchVersions = useCallback(async () => {
    if (!selectedChain) {
      setVersions([]);
      setSelectedVersion(null);
      return;
    }

    setIsLoadingVersions(true);

    const { data, error } = await supabase
      .from('protocols')
      .select('id, version, name, protocol_data, verified, weighted_goal_score, viability_score, version_chain_id, created_at, change_source, change_note, critiques')
      .eq('version_chain_id', selectedChain.version_chain_id)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      setIsLoadingVersions(false);
      return;
    }

    if (data && data.length > 0) {
      setVersions(data);
      // Select the latest version (first in list since sorted desc)
      setSelectedVersion(data[0]);
    } else {
      setVersions([]);
      setSelectedVersion(null);
    }

    setIsLoadingVersions(false);
  }, [selectedChain]);

  // Parse protocol data when version changes
  useEffect(() => {
    if (selectedVersion?.protocol_data) {
      try {
        const normalized = normalizeProtocol(selectedVersion.protocol_data);
        setParsedProtocol(normalized);
      } catch (e) {
        console.error('Error parsing protocol:', e);
        setParsedProtocol(null);
      }
    } else {
      setParsedProtocol(null);
    }
  }, [selectedVersion]);

  // Initial fetch when user changes
  useEffect(() => {
    fetchChains();
  }, [user]);

  // Fetch versions when chain changes
  useEffect(() => {
    if (selectedChain) {
      fetchVersions();
    }
  }, [selectedChain?.version_chain_id]);

  const selectChain = useCallback((chain: ProtocolChain) => {
    setSelectedChain(chain);
    setVersions([]);
    setSelectedVersion(null);
    setParsedProtocol(null);
  }, []);

  const selectVersion = useCallback((version: ProtocolVersion) => {
    setSelectedVersion(version);
  }, []);

  // Update helpers for local state modifications
  const updateSelectedChain = useCallback((updates: Partial<ProtocolChain>) => {
    setSelectedChain(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const updateSelectedVersion = useCallback((updates: Partial<ProtocolVersion>) => {
    setSelectedVersion(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return (
    <ProtocolContext.Provider
      value={{
        chains,
        isLoadingChains,
        selectedChain,
        selectedVersion,
        parsedProtocol,
        selectChain,
        selectVersion,
        refreshChains: fetchChains,
        refreshVersions: fetchVersions,
        versions,
        isLoadingVersions,
        updateSelectedChain,
        updateSelectedVersion,
        setChains,
      }}
    >
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (context === undefined) {
    throw new Error('useProtocol must be used within a ProtocolProvider');
  }
  return context;
}
