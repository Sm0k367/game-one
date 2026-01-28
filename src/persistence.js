/**
 * Persistence Manager for Neural State
 * Saves player position and world modifications.
 */

export const PersistenceManager = {
    save: (key, data) => {
        const state = JSON.stringify(data);
        localStorage.setItem(`neural_state_${key}`, state);
    },

    load: (key) => {
        const data = localStorage.getItem(`neural_state_${key}`);
        return data ? JSON.parse(data) : null;
    },

    // Tracks if the user has a "Legacy" in this city
    getHasPlayed: () => {
        return localStorage.getItem('neural_state_init') === 'true';
    },

    setInit: () => {
        localStorage.setItem('neural_state_init', 'true');
    }
};
