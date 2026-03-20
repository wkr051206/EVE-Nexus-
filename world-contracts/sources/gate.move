module world::gate {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::event;

    /// Gate structure for EVE Frontier
    public struct Gate has key {
        id: UID,
        region_id: u64,
        owner: address,
    }

    /// Owner capability for a Gate (required to install extensions)
    public struct OwnerCap<phantom T> has key, store {
        id: UID,
        object_id: ID,
    }

    /// Jump permit for character travel
    public struct JumpPermit has key, store {
        id: UID,
        character: address,
        source_region: u64,
        target_region: u64,
        expiry_timestamp: u64,
    }

    /// Event emitted when a jump permit is issued
    public struct JumpPermitIssued has copy, drop {
        character: address,
        source_region: u64,
        target_region: u64,
        expiry_timestamp: u64,
    }

    /// Create a new gate and return its OwnerCap
    public fun create_gate(region_id: u64, ctx: &mut TxContext): (Gate, OwnerCap<Gate>) {
        let gate = Gate {
            id: object::new(ctx),
            region_id,
            owner: ctx.sender(),
        };
        let cap = OwnerCap<Gate> {
            id: object::new(ctx),
            object_id: object::id(&gate),
        };
        (gate, cap)
    }

    /// Issue a jump permit via an authorized witness (used by extensions like DynamicGateExt)
    public fun issue_jump_permit<Auth: drop>(
        gate: &Gate,
        destination_gate: &Gate,
        character: address,
        _auth: Auth,
        expires_at: u64,
        ctx: &mut TxContext,
    ): JumpPermit {
        let permit = JumpPermit {
            id: object::new(ctx),
            character,
            source_region: gate.region_id,
            target_region: destination_gate.region_id,
            expiry_timestamp: expires_at,
        };
        event::emit(JumpPermitIssued {
            character,
            source_region: gate.region_id,
            target_region: destination_gate.region_id,
            expiry_timestamp: expires_at,
        });
        permit
    }

    /// Create a jump permit directly (no auth required, for simple use cases)
    public fun create_jump_permit(
        character: address,
        source_region: u64,
        target_region: u64,
        expiry_timestamp: u64,
        ctx: &mut TxContext,
    ): JumpPermit {
        JumpPermit {
            id: object::new(ctx),
            character,
            source_region,
            target_region,
            expiry_timestamp,
        }
    }

    public fun gate_region(gate: &Gate): u64 { gate.region_id }
    public fun gate_owner(gate: &Gate): address { gate.owner }
    public fun jump_permit_character(permit: &JumpPermit): address { permit.character }
    public fun jump_permit_source(permit: &JumpPermit): u64 { permit.source_region }
    public fun jump_permit_target(permit: &JumpPermit): u64 { permit.target_region }

    public fun is_jump_permit_expired(permit: &JumpPermit, current_time: u64): bool {
        permit.expiry_timestamp < current_time
    }

    public fun transfer_gate(gate: Gate, new_owner: address) {
        transfer::transfer(gate, new_owner);
    }

    public fun destroy_expired_jump_permit(permit: JumpPermit, current_time: u64) {
        assert!(is_jump_permit_expired(&permit, current_time), 0);
        let JumpPermit { id, character: _, source_region: _, target_region: _, expiry_timestamp: _ } = permit;
        object::delete(id);
    }
}
