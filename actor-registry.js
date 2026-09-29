/**
 * ACTOR REGISTRY
 * 
 * Role-based hierarchy for governance audit trails
 * - CEO (highest authority)
 * - Board (collective authority)
 * - Director (operational authority)
 * - Staff (expandable tier for team members)
 * 
 * Each actor has:
 * - Unique ID / Name
 * - Role
 * - Authority level (for governance-grade decision tracking)
 * - Active status (tracking staff turnover)
 */

class ActorRegistry {
  constructor() {
    this.actors = JSON.parse(localStorage.getItem('lomos_actor_registry')) || [];
    this.initializeDefault();
  }

  /**
   * Initialize default actors (CEO, Board, Director)
   */
  initializeDefault() {
    // Only initialize if empty
    if (this.actors.length === 0) {
      this.addActor('charle-lr-brandt', 'Charle LR Brandt', 'CEO', 4, 'Founder, Governance Architect');
      this.addActor('board-collective', 'Board', 'Board', 3, 'Collective board authority');
      this.addActor('director-ops', 'Operations Director', 'Director', 2, 'Operational authority');
    }
  }

  /**
   * Add a new actor
   * @param {string} actor_id - Unique ID (slug format)
   * @param {string} name - Full name / role name
   * @param {string} role - 'CEO', 'Board', 'Director', 'Staff'
   * @param {number} authority_level - 1-4 (1=staff, 4=CEO)
   * @param {string} description - Role description / title
   */
  addActor(actor_id, name, role, authority_level, description = '') {
    // Check if already exists
    if (this.actors.find(a => a.actor_id === actor_id)) {
      console.warn(`Actor ${actor_id} already exists`);
      return null;
    }

    const actor = {
      actor_id: actor_id,
      name: name,
      role: role,
      authority_level: authority_level,
      description: description,
      created_date: new Date().toISOString(),
      active: true
    };

    this.actors.push(actor);
    this.persist();
    return actor;
  }

  /**
   * Add staff member (expandable tier)
   */
  addStaffMember(staff_id, full_name, title, description = '') {
    return this.addActor(
      `staff-${staff_id}`,
      full_name,
      'Staff',
      1, // Authority level 1 (lowest)
      title || description
    );
  }

  /**
   * Get actor by ID
   */
  getActor(actor_id) {
    return this.actors.find(a => a.actor_id === actor_id);
  }

  /**
   * Get all actors by role
   */
  getByRole(role) {
    return this.actors.filter(a => a.role === role && a.active);
  }

  /**
   * Get all active actors
   */
  getAllActive() {
    return this.actors.filter(a => a.active);
  }

  /**
   * Deactivate actor (track staff turnover, don't delete)
   */
  deactivateActor(actor_id) {
    const actor = this.getActor(actor_id);
    if (actor) {
      actor.active = false;
      actor.deactivated_date = new Date().toISOString();
      this.persist();
      return actor;
    }
    return null;
  }

  /**
   * Reactivate actor
   */
  reactivateActor(actor_id) {
    const actor = this.getActor(actor_id);
    if (actor) {
      actor.active = true;
      delete actor.deactivated_date;
      this.persist();
      return actor;
    }
    return null;
  }

  /**
   * Validate actor has authority for action
   * (governance check: did the right person make this decision?)
   */
  validateAuthority(actor_id, required_authority_level) {
    const actor = this.getActor(actor_id);
    if (!actor || !actor.active) {
      return { valid: false, reason: 'Actor not found or inactive' };
    }
    if (actor.authority_level < required_authority_level) {
      return { 
        valid: false, 
        reason: `Actor ${actor.name} (level ${actor.authority_level}) insufficient for required level ${required_authority_level}` 
      };
    }
    return { valid: true, actor: actor };
  }

  /**
   * Format actor for audit trail
   */
  formatForAudit(actor_id) {
    const actor = this.getActor(actor_id);
    if (!actor) return 'unknown-actor';
    return `${actor.name} (${actor.role})`;
  }

  /**
   * Authority hierarchy info
   */
  getHierarchy() {
    return {
      '4': { role: 'CEO', description: 'Highest authority, strategic decisions' },
      '3': { role: 'Board', description: 'Collective authority, major approvals' },
      '2': { role: 'Director', description: 'Operational authority, day-to-day execution' },
      '1': { role: 'Staff', description: 'Team members, can log but not approve' }
    };
  }

  /**
   * Get organizational structure
   */
  getOrganizationStructure() {
    const hierarchy = {};
    [4, 3, 2, 1].forEach(level => {
      const level_info = this.getHierarchy()[level];
      const actors = this.actors.filter(a => a.authority_level === level && a.active);
      hierarchy[level_info.role] = {
        level: level,
        description: level_info.description,
        members: actors.map(a => ({
          name: a.name,
          actor_id: a.actor_id,
          title: a.description
        }))
      };
    });
    return hierarchy;
  }

  /**
   * Export actor registry as CSV (for governance record)
   */
  exportCSV() {
    let csv = 'actor_id,name,role,authority_level,title,active,created_date,deactivated_date\n';

    this.actors.forEach(a => {
      csv += `"${a.actor_id}","${a.name}","${a.role}",${a.authority_level},"${a.description}","${a.active ? 'Yes' : 'No'}","${a.created_date}","${a.deactivated_date || ''}"\n`;
    });

    return csv;
  }

  /**
   * Persist to storage
   */
  persist() {
    localStorage.setItem('lomos_actor_registry', JSON.stringify(this.actors));
  }

  /**
   * Get all actors (including inactive, for history)
   */
  getAll() {
    return this.actors;
  }
}

// Global instance
window.actorRegistry = new ActorRegistry();
