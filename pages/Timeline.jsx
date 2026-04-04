import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ClockIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import TimelineEvent from '../components/timeline/TimelineEvent'
import TimelineFilters from '../components/timeline/TimelineFilters'
import { api } from '../services/api'

const Timeline = () => {
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    severity: '',
    timeRange: '24h'
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: timelineData, isLoading, refetch } = useQuery({
    queryKey: ['timeline', filters],
    queryFn: () => api.request(`/api/timeline/events/recent?hours=${
      filters.timeRange === '1h' ? 1 :
      filters.timeRange === '6h' ? 6 :
      filters.timeRange === '7d' ? 168 :
      filters.timeRange === '30d' ? 720 : 24
    }${filters.severity ? `&severity=${filters.severity}` : ''}${filters.eventType ? `&source=${filters.eventType}` : ''}&limit=200`),
    refetchInterval: 30000
  })

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const events = (timelineData?.data?.timeline?.events || []).filter(e =>
    !filters.search || 
    e.event_type?.toLowerCase().includes(filters.search.toLowerCase()) ||
    e.ip_address?.includes(filters.search) ||
    e.user_id?.toLowerCase().includes(filters.search.toLowerCase())
  )
  const totalEvents = timelineData?.data?.timeline?.total_events || 0

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.timestamp).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {})

  const eventTypeCounts = {
    security: events.filter(e => e.event_type === 'security_alert').length,
    system: events.filter(e => e.event_type === 'system_event').length,
    user: events.filter(e => e.event_type === 'user_activity').length,
    network: events.filter(e => e.event_type === 'network_event').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Timeline</h1>
          <p className="text-gray-400 mt-1">
            Chronological view of security events and incidents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search timeline events..."
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
            <TimelineFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}
      </div>

      {/* Event Type Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Security Alerts</p>
              <p className="text-2xl font-bold text-red-400">{eventTypeCounts.security}</p>
            </div>
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">System Events</p>
              <p className="text-2xl font-bold text-blue-400">{eventTypeCounts.system}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">User Activity</p>
              <p className="text-2xl font-bold text-green-400">{eventTypeCounts.user}</p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-cyan-400">{totalEvents}</p>
            </div>
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-cyan-400" />
            Event Timeline ({events.length} of {totalEvents})
          </h3>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading timeline...</p>
            </div>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No events found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedEvents)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, dateEvents]) => (
                  <div key={date} className="relative">
                    {/* Date Header */}
                    <div className="sticky top-0 bg-gray-800 border-b border-gray-700 pb-2 mb-4 z-10">
                      <h4 className="text-lg font-semibold text-white">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h4>
                      <p className="text-sm text-gray-400">{dateEvents.length} events</p>
                    </div>

                    {/* Timeline Line */}
                    <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-600"></div>

                    {/* Events */}
                    <div className="space-y-4 relative">
                      {dateEvents
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map((event, index) => (
                          <TimelineEvent 
                            key={event.id || index} 
                            event={event}
                            isLast={index === dateEvents.length - 1}
                          />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Timeline