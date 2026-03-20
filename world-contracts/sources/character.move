module world::character {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer;

    /// Character structure for EVE Frontier
    public struct Character has key {
        id: UID,
        owner: address,
        name: vector<u8>,
        level: u8,
        experience: u64,
        region_id: u64,
    }

    /// Create a new character
    public fun create_character(
        name: vector<u8>,
        level: u8,
        experience: u64,
        region_id: u64,
        ctx: &mut TxContext
    ): Character {
        Character {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            name,
            level,
            experience,
            region_id,
        }
    }

    /// Get character owner
    public fun character_owner(character: &Character): address {
        character.owner
    }

    /// Get character level
    public fun character_level(character: &Character): u8 {
        character.level
    }

    /// Get character experience
    public fun character_experience(character: &Character): u64 {
        character.experience
    }

    /// Get character region
    public fun character_region(character: &Character): u64 {
        character.region_id
    }

    /// Level up character
    public fun level_up(character: &mut Character, experience_gain: u64) {
        character.experience = character.experience + experience_gain;
        // Simple level calculation: 1000 XP per level, capped at 255
        let raw_level = character.experience / 1000;
        let new_level: u8 = if (raw_level > 255) { 255u8 } else { raw_level as u8 };
        if (new_level > character.level) {
            character.level = new_level;
        };
    }

    /// Move character to different region
    public fun move_character(character: &mut Character, new_region_id: u64) {
        character.region_id = new_region_id;
    }

    /// Transfer character ownership
    public fun transfer_character(character: Character, new_owner: address, ctx: &mut TxContext) {
        transfer::transfer(character, new_owner);
    }
}