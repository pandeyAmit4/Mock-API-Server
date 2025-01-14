export class DOMUpdater {
    static getItemKey(item, keyField = 'id') {
        return item[keyField] || JSON.stringify(item);
    }

    static compareItems(oldItem, newItem) {
        return JSON.stringify(oldItem) === JSON.stringify(newItem);
    }

    static calculateUpdates(oldData, newData, keyField = 'id') {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            unchanged: []
        };

        const oldMap = new Map(oldData.map(item => [this.getItemKey(item, keyField), item]));
        const newMap = new Map(newData.map(item => [this.getItemKey(item, keyField), item]));

        // Find added and modified items
        newMap.forEach((newItem, key) => {
            if (!oldMap.has(key)) {
                changes.added.push(newItem);
            } else if (!this.compareItems(oldMap.get(key), newItem)) {
                changes.modified.push(newItem);
            } else {
                changes.unchanged.push(newItem);
            }
        });

        // Find removed items
        oldMap.forEach((oldItem, key) => {
            if (!newMap.has(key)) {
                changes.removed.push(oldItem);
            }
        });

        return changes;
    }
}
