/* State v5 finite state machine library
 * http://www.steelbreeze.net/state.js
 * Copyright (c) 2014-5 Steelbreeze Limited
 * Licensed under MIT and GPL v3 licences
 */
module FSM {
    // TODO: make these private
    export interface Func<T1, T2, T3, TR> { (p1: T1, p2: T2, p3: T3): TR }
    export interface Action<T1, T2, T3> extends Func<T1, T2, T3, void> { }
    export interface Actions<T1, T2, T3> extends Array<Action<T1, T2, T3>> { }
    export interface Predicate<T1, T2> { (p1: T1, p2: T2):Boolean }

    function invoke<T1, T2, T3>(actions: Actions<T1, T2, T3>, p1?: T1, p2?: T2, p3?: T3): void {
        if (actions) {
            for (var i:number = 0, l:number = actions.length; i < l; i++) {
                actions[i](p1, p2, p3);
            }
        }
    }

    // DONE: TODO: remove this line
    export interface IContext {
        isTerminated: Boolean;
        setCurrent(region: StateMachineElement, value: State): void;
        getCurrent(region: StateMachineElement): State;
    }

    // DONE: TODO: remove this line
    interface StateDictionary {
        [index: string]: State;
    }

    // DONE: TODO: remove this line
    export class DictionaryContext implements IContext {
        private last: StateDictionary = {};

        public isTerminated: Boolean = false;

        constructor(public name: string) {
        }

        setCurrent(region: StateMachineElement, value: State) {
            if(region) {
                this.last[region.qualifiedName] = value;
            }
        }

        getCurrent(region: StateMachineElement) {
            return this.last[region.qualifiedName];
        }

        toString(): string {
            return this.name;
        }
    }

    // DONE: TODO: remove this line
    export class NamedElement {
        public static namespaceSeperator = ".";
        qualifiedName: string;

        constructor( public name: string, parent: NamedElement) {
            this.qualifiedName = parent ? parent.qualifiedName + NamedElement.namespaceSeperator + name : name;
        }

        toString(): String {
            return this.qualifiedName;
        }
    }

    // DONE: TODO: remove this line
    export class StateMachineElement extends NamedElement {
        root: StateMachine;
        leave: Actions<any, IContext, Boolean>;
        beginEnter: Actions<any, IContext, Boolean>;
        endEnter: Actions<any, IContext, Boolean>;
        enter: Actions<any, IContext, Boolean>;

        constructor(name: string, public parent: StateMachineElement) {
            super(name, parent);

            if(parent) {
                this.root = parent.root;
            }

            this.reset();
        }

        ancestors(): StateMachineElement[] {
            return (this.parent ? this.parent.ancestors() : []).concat(this);
        }

        reset(): void {
            this.leave = [];
            this.beginEnter = [];
            this.endEnter = [];
            this.enter = [];
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            var element = this;

            // TODO: remove console.log on final release
            this.leave.push(function(message: any, context: IContext, history: Boolean) { console.log(context + " leave " + element); });
            this.beginEnter.push(function(message: any, context: IContext, history: Boolean) { console.log(context + " enter " + element); });

            this.enter = this.beginEnter.concat(this.endEnter);
        }

        bootstrapEnter(traverse: Actions<any, IContext, Boolean>, next: StateMachineElement) {
            traverse = traverse.concat(this.beginEnter);
        }
    }

    // DONE: TODO: remove this line
    export class Vertex extends StateMachineElement {
        transitions: Transition[] = [];
        selector: Func<Transition[], any, IContext, Transition>;
        
        constructor(name: string, parent: Region, selector: Func<Transition[], any, IContext, Transition>) {
            super(name, parent);

            this.selector = selector;
            
            if (parent) {
                parent.vertices.push(this);

                this.root.clean = false;
            }
        }

        To(target?: Vertex): Transition {
            var transition = new Transition(this, target);

            this.transitions.push(transition);
            this.root.clean = false;

            return transition;
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            super.bootstrap(deepHistoryAbove);

            var vertex = this;

            this.endEnter.push(function(message: any, context: IContext, history: Boolean): void {vertex.evaluateCompletions(message, context, history);});
            this.enter = this.beginEnter.concat(this.endEnter);
        }

        bootstrapTransitions(): void {
            for( var i:number = 0, l:number = this.transitions.length; i < l; i++) {
                this.transitions[i].bootstrap();
            }
        }

        evaluateCompletions(message: any, context: IContext, history: Boolean) {
            if (this.isComplete(context)) {
                this.evaluate(this, context);
            }
        }

        isFinal(): Boolean {
            return this.transitions.length === 0;
        }
        
        isComplete(context: IContext): Boolean {
            return true;
        }

        evaluate(message: any, context: IContext): Boolean {
            var transition: Transition = this.selector(this.transitions, message, context);
            
            if (transition) {
                invoke(transition.traverse, message, context, false);
                
                return true;
            } else {
                return false
            }
        }
    }

    export class Region extends StateMachineElement {
        vertices: Vertex[] = [];
        initial: PseudoState;

        constructor(name: string, parent: State) {
            super(name, parent);

            parent.regions.push(this);
            this.root.clean = false;
        }

        isComplete(context: IContext): Boolean {
            return context.getCurrent(this).isFinal();
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            var region: Region = this;

            for( var i:number = 0, l:number = this.vertices.length; i < l; i++) {
                var vertex = this.vertices[i];
                vertex.reset();
                vertex.bootstrap(deepHistoryAbove || (this.initial && this.initial.kind === PseudoStateKind.DeepHistory));
            }

            this.leave.push(function(message: any, context: IContext, history: Boolean) { var current = context.getCurrent(region); if (current.leave) { invoke(current.leave, message, context, history); } });

            if (deepHistoryAbove || !this.initial || isHistory(this.initial.kind)) {
                var init: PseudoState = this.initial;

                this.endEnter.push(function(message: any, context: IContext, history: Boolean) { var ini:Vertex = init; if (history || isHistory(init.kind)) {ini = context.getCurrent(region) || init;} invoke(ini.enter, message, context, history || (init.kind === PseudoStateKind.DeepHistory)); });
            } else {
                this.endEnter = this.endEnter.concat(this.initial.enter);
            }

            super.bootstrap(deepHistoryAbove);
        }

        bootstrapTransitions(): void {
            for( var i:number = 0, l:number = this.vertices.length; i < l; i++) {
                this.vertices[i].bootstrapTransitions();
            }
        }
    }

    export enum PseudoStateKind {
        Choice,
        DeepHistory,
        Initial,
        ShallowHistory,
        Terminate
    }

    function isHistory(kind: PseudoStateKind): Boolean {
        return kind === PseudoStateKind.DeepHistory || kind === PseudoStateKind.ShallowHistory;
    }

    function isInitial(kind: PseudoStateKind): Boolean {
        return kind === PseudoStateKind.Initial || isHistory(kind);
    }

    export class PseudoState extends Vertex {
        constructor(name: string, parent: Region, public kind: PseudoStateKind) {
            super(name, parent, pseudoState(kind));

            if (isInitial(kind)) {
                parent.initial = this;
            }
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            super.bootstrap(deepHistoryAbove);

            if (this.kind === PseudoStateKind.Terminate) {
                this.enter.push(function(message: any, context: IContext, history: Boolean) { context.isTerminated = true; });
            }
        }
    }

    export class State extends Vertex {
        regions: Region[] = [];
        exitActions: Actions<any, IContext, Boolean> = [];
        entryActions: Actions<any, IContext, Boolean> = [];

        constructor(name: string, parent: Region) {
            super(name, parent, state);
        }

        exit<TMessage>(action: Action<TMessage, IContext, Boolean>): State {
            this.exitActions.push(action);

            this.root.clean = false;

            return this;
        }

        entry<TMessage>(action: Action<TMessage, IContext, Boolean>): State {
            this.entryActions.push(action);

            this.root.clean = false;

            return this;
        }

        isFinal(): Boolean {
            return false;
        }

        isSimple(): Boolean {
            return this.regions.length === 0;
        }

        isComposite(): Boolean {
            return this.regions.length > 0;
        }

        isOrthogonal(): Boolean {
            return this.regions.length > 1;
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            var state: State = this; // TODO: make sure state.parent in callback below works
            var sparent = this.parent;

            for( var i:number = 0, l:number = this.regions.length; i < l; i++) {
                var region: Region = this.regions[i];
                region.reset();
                region.bootstrap(deepHistoryAbove);

                this.leave.push(function(message: any, context: IContext, history: Boolean) { invoke(region.leave, message, context, history); });

                this.endEnter = this.endEnter.concat(region.enter);
            }

            super.bootstrap(deepHistoryAbove);

            this.leave = this.leave.concat(this.exitActions);
            this.beginEnter = this.beginEnter.concat(this.entryActions);

            this.beginEnter.push(function(message: any, context: IContext, history: Boolean) { context.setCurrent(sparent, state); });

            this.enter = this.beginEnter.concat(this.endEnter);
        }

        bootstrapTransitions(): void {
            for( var i:number = 0, l:number = this.regions.length; i < l; i++) {
                this.regions[i].bootstrapTransitions();
            }

            super.bootstrapTransitions();
        }

        bootstrapEnter(traverse: Actions<any, IContext, Boolean>, next: StateMachineElement) {
            super.bootstrapEnter(traverse, next);

        for( var i:number = 0, l:number = this.regions.length; i < l; i++) {
                var region: Region = this.regions[i];

                if (region !== next) {
                    traverse = traverse.concat(region.enter);
                }
            }
        }
    }

    export class FinalState extends State {
        constructor(name: string, parent: Region) {
            super(name, parent);
        }

        isFinal(): Boolean {
            return true;
        }
    }

    export class StateMachine extends State {
        clean: Boolean = true;

        constructor(name: string) {
            super(name, undefined);

            this.root = this;
        }

        bootstrap(deepHistoryAbove: Boolean): void {
            super.bootstrap(deepHistoryAbove);
            super.bootstrapTransitions();

            this.clean = true;
        }

        initialise(context: IContext, autoBootstrap: boolean = true): void {
            if (autoBootstrap && this.clean === false) {
                this.bootstrap(false);
            }

            invoke(this.enter, undefined, context, false);
        }
    }

    export class Transition {
        guard: Predicate<any, IContext>;
        actions: Actions<any, IContext, Boolean> = [];
        traverse: Actions<any, IContext, Boolean> = [];

        constructor(private source: Vertex, private target?: Vertex) {
            // default the transition to a completion transition
            this.completion();
        }

        completion(): Transition {
            this.guard = function(context: IContext, message: any): Boolean { return message === this.source; };

            return this;
        }

        when<TMessage>(guard: Predicate<TMessage, IContext>): Transition {
            this.guard = guard;

            return this;
        }

        effect<TMessage>(action: Action<TMessage, IContext, Boolean>): Transition {
            this.actions.push(action);

            this.source.root.clean = false;

            return this;
        }

        bootstrap(): void {
            if (this.target === null) { // internal transitions: just the actions
                this.traverse = this.actions;
            } else if (this.target.parent === this.source.parent) { // local transitions: exit and enter with no complexity
                this.traverse = this.source.leave.concat(this.actions).concat(this.target.enter);
            } else { // complex external transition
                var sourceAncestors = this.source.ancestors();
                var targetAncestors = this.target.ancestors();
                var i: number = 0, l: number = Math.min(sourceAncestors.length, targetAncestors.length);

                // find the index of the first uncommon ancestor
                while((i < l) && (sourceAncestors[i] === targetAncestors[i])) {
                    ++i;
                }

                // TODO: assert common ancestor is a region


                // leave the first uncommon ancestor
                this.traverse = (i < sourceAncestors.length ? sourceAncestors[i] : this.source).leave;

                // perform the transition action
                this.traverse = this.traverse.concat(this.actions);

                // enter the target ancestry
                while(i < targetAncestors.length) {
                    targetAncestors[i++].bootstrapEnter(this.traverse, targetAncestors[i]);
                }

                // trigger cascade
                this.traverse = this.traverse.concat(this.target.endEnter);
            }
        }
    }
    
    function pseudoState(kind: PseudoStateKind): Func<Transition[], any, IContext, Transition> {
        // TODO: add other pseudostatekind selectors
        return initial;
    }
        
    function state(transitions: Transition[], message: any, context: IContext): Transition {
        var result: Transition;
                
        for (var i:number = 0, l:number = transitions.length; i < l; i++) {
            if(transitions[i].guard(message, context)) {
                if(result) {
                    throw "Multiple outbound transitions evaluated true";
                }

                result = transitions[i];
            }
        }
        
        return result;
    }
    
    function initial(transitions: Transition[], message: any, context: IContext): Transition {
        if(transitions.length === 1) {
            return transitions[0];
        } else {
            throw "Initial transition must have a single outbound transition";
        }
    }        
}