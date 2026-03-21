// Transition.swift
// Copyright © 2020 Noto. All rights reserved.

import UIKit

public protocol ViewerTransition: AnyObject {
    // Required
    func animateTransition(context: TransitionContext)

    // Optional. Does the animation wants interactive start.
    // If true, then the transition doesn't require to call `context.beginInteractiveTransition()`
    // but it has to call `context.endInteractiveTransition(_ isCompleting: Bool)` when the interactive transition ends.
    // Default: false
    var wantsInteractiveStart: Bool { get }

    // Optional. Simutanous transition
    // Whether or not the transition can be performed simutanously with another transition
    // Default: false
    func canTransitionSimutanously(with transition: ViewerTransition) -> Bool

    // Optional. Reverse the transition if possible.
    // This method needs to call `context.beginInteractiveTransition()` and
    // `context.endInteractiveTransition(_ isCompleting: Bool)`
    // if it can execute the reversal
    func reverse()
}

extension ViewerTransition {
    public var wantsInteractiveStart: Bool { false }
    public func canTransitionSimutanously(with transition: ViewerTransition) -> Bool { false }
    public func reverse() {
        // no-op
    }
}
