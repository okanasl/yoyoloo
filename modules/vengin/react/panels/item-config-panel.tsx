import { Item } from "../../item/item"

function ItemConfigPanel({item}: {item: Item}) {
    return <div>Item cfg: {item.name}</div>
}

export { ItemConfigPanel }