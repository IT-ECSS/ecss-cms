import React, { Component } from 'react';
import '../../../css/sub/fitnessSitesSection.css';

/**
 * FitnessSitesSection - Display site/location-level fitness statistics
 * Shows aggregated data for each site with participations and participants
 */
class FitnessSitesSection extends Component {
  calculateSiteStatistics = () => {
    const { filteredData = [] } = this.props;

    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // Group data by location
    const siteMap = {};

    filteredData.forEach(row => {
      const location = row.location || 'Unknown Site';
      
      if (!siteMap[location]) {
        siteMap[location] = {
          site: location,
          totalParticipants: 0,
          maleCount: 0,
          femaleCount: 0,
          records: []
        };
      }

      siteMap[location].records.push(row);
      siteMap[location].totalParticipants++;

      // Count by gender
      const gender = (row.gender || row.Gender || row.GENDER || '').toLowerCase();
      if (gender === 'male' || gender === 'm') {
        siteMap[location].maleCount++;
      } else if (gender === 'female' || gender === 'f') {
        siteMap[location].femaleCount++;
      }
    });

    // Convert to array and sort by site name
    return Object.values(siteMap).sort((a, b) => 
      a.site.localeCompare(b.site)
    );
  };

  render() {
    const siteStats = this.calculateSiteStatistics();
    const { yearFrom, yearTo } = this.props;

    return (
      <div className="fft-sites-section">
        <div className="fft-sites-header">
          <h3 className="fft-sites-title">
            <i className="fas fa-map-marked-alt"></i>
            Site Statistics
          </h3>
          <p className="fft-sites-subtitle">
            Aggregated fitness data by site
            {yearFrom && yearTo && yearFrom !== yearTo && ` (${yearFrom} - ${yearTo})`}
            {yearFrom && yearTo && yearFrom === yearTo && ` (${yearFrom})`}
            {yearFrom && !yearTo && ` (From ${yearFrom})`}
            {!yearFrom && yearTo && ` (Until ${yearTo})`}
          </p>
        </div>

        <div className="fft-sites-container">
          {siteStats.length === 0 ? (
            <div className="fft-sites-empty">
              <i className="fas fa-inbox"></i>
              <p>No site data available for the selected filters</p>
            </div>
          ) : (
            <div className="fft-sites-grid">
              {siteStats.map((site, index) => {
                const femalePercentage = site.totalParticipants > 0 
                  ? Math.round((site.femaleCount / site.totalParticipants) * 100) 
                  : 0;
                const malePercentage = site.totalParticipants > 0 
                  ? Math.round((site.maleCount / site.totalParticipants) * 100) 
                  : 0;

                return (
                  <div key={site.site} className="fft-site-card">
                    <div className="fft-site-card-header">
                      <h4 className="fft-site-name">{site.site}</h4>
                    </div>

                    <div className="fft-site-card-content">
                      {/* Total Participants */}
                      <div className="fft-site-metric">
                        <div className="fft-site-metric-label">
                          <i className="fas fa-users"></i>
                          Total Participants
                        </div>
                        <div className="fft-site-metric-value">
                          {site.totalParticipants}
                        </div>
                      </div>

                      {/* Gender Breakdown */}
                      <div className="fft-site-gender-breakdown">
                        <div className="fft-site-gender-item">
                          <span className="fft-site-gender-label">
                            <i className="fas fa-mars" style={{ color: '#3b82f6' }}></i>
                            Male
                          </span>
                          <div className="fft-site-gender-bar">
                            <div 
                              className="fft-site-gender-fill male"
                              style={{ width: `${malePercentage}%` }}
                            ></div>
                          </div>
                          <span className="fft-site-gender-count">
                            {site.maleCount} ({malePercentage}%)
                          </span>
                        </div>

                        <div className="fft-site-gender-item">
                          <span className="fft-site-gender-label">
                            <i className="fas fa-venus" style={{ color: '#ec4899' }}></i>
                            Female
                          </span>
                          <div className="fft-site-gender-bar">
                            <div 
                              className="fft-site-gender-fill female"
                              style={{ width: `${femalePercentage}%` }}
                            ></div>
                          </div>
                          <span className="fft-site-gender-count">
                            {site.femaleCount} ({femalePercentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default FitnessSitesSection;
