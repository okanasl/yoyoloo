import { Container, ContainerChild, ContainerOptions } from "pixi.js";

class GlobalContainer extends Container {
    constructor(options?: ContainerOptions<ContainerChild> | undefined, ) {
        super(options);
    }
}

export { GlobalContainer }