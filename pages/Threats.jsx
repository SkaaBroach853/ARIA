import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ShieldExclamationIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import ThreatCard from '../components/threats/ThreatCard'
import ThreatFilters from '../components/threats/ThreatFilters'
import ThreatDetails from '../components/threats/ThreatDetails'
import { api } from '../services/api'

const Threats = () => {
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    status: '',
    type: '',
    timeRange: '24h'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedThreat, setSelectedThreat] = useState(null)

  const { data: threatsData, isLoading, refetch } = useQuery({
    queryKey: ['threats', filters],
    queryFn: () => api.getThreats(filters),
    refetchInterval: 30000
  })

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const threats = threatsData?.data || []
  const totalThreats = threatsData?.total || 0

  const severityCounts = {
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    medium: threats.filter(t => t.severity === 'medium').length,
    low: threats.filter(t => t.severity === 'low').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
          <p className="text-gray-400 mt-1">
            Monitor and analyze security threats across your environment
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search threats by name, IOC, or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <ThreatFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}
      </div>

      {/* Severity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical Threats</p>
              <p className="text-2xl font-bold text-red-400">{severityCounts.critical}</p>
            </div>
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <ShieldExclamationIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Severity</p>
              <p className="text-2xl font-bold text-orange-400">{severityCounts.high}</p>
            </div>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <ShieldExclamationIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Medium Severity</p>
              <p className="text-2xl font-bold text-yellow-400">{severityCounts.medium}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <ShieldExclamationIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Threats</p>
              <p className="text-2xl font-bold text-cyan-400">{totalThreats}</p>
            </div>
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <ShieldExclamationIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Threats Grid */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Active Threats ({threats.length} of {totalThreats})
          </h3>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading threats...</p>
            </div>
          ) : threats.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShieldExclamationIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No threats found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {threats.map((threat) => (
                <ThreatCard 
                  key={threat.id} 
                  threat={threat}
                  onViewDetails={() => setSelectedThreat(threat)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Threat Details Modal */}
      {selectedThreat && (
        <ThreatDetails 
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
        />
      )}
    </div>
  )
}

export default Threats