function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

class Board {
	constructor(width, height, num_bombs) {
		this.width = width;
		this.height = height;
		this.num_bombs = num_bombs;
	}

	row(index) {
		return Math.floor(index / this.width);
	}

	column(index) {
		return index % this.width;
	}


	radius(index) {
		let row = this.row(index)
		let col = this.column(index)
		let start_row = row > 0 ? row - 1 : row
		let end_row = row < this.height - 1 ? row + 1 : row
		let start_col = col > 0 ? col - 1 : col
		let end_col = col < this.width - 1 ? col + 1 : col
		let result = [];
		for (var r = start_row; r <= end_row; r++) {
			for (var c = start_col; c <= end_col; c++) {
				result.push(r * this.width + c)
			}
		}
		return result
	}

	generate_tiles(safe_tiles = []) {
		let total_tiles = this.width * this.height
		this.tiles = []
		for (let i = 0; i < total_tiles; i++) {
			this.tiles.push(new Tile(false))
		}
		let bombs_left = this.num_bombs
		for (let i = 0; i < total_tiles; i++) {
			if (safe_tiles.includes(i)) {
				continue
			}
			let r = getRandomInt(total_tiles - i)
			if (r < bombs_left) {
				this.tiles[i].bomb = true
				bombs_left -= 1;
				for (var tile of this.radius(i)) {
					this.tiles[tile].number += 1;
				}
			}
		}
	}

	reveal(index) {
		var tile = this.tiles[index]
		if (tile.flagged) {
			return
		}
		tile.revealed = true
		this.gui.draw_tile(index)
		if (tile.number == 0) {
			let to_reveal = [index]
			while(to_reveal.length > 0) {
				let zero_index = to_reveal.pop()
				for (var neighbor_index of this.radius(zero_index)) {
					let neighbor = this.tiles[neighbor_index]
					if (!neighbor.revealed && !neighbor.flagged) {
						neighbor.revealed = true
						this.gui.draw_tile(neighbor_index)
						if (neighbor.number == 0) {
							to_reveal.push(neighbor_index)
						}
					}
				}
			}
		}
	}

	chord(index) {
		var tile = this.tiles[index]
		if (!tile.revealed || tile.bomb) {
			return
		}
		let flagged_count = 0
		let neighbors = this.radius(index)
		for (var neighbor of neighbors) {
			let n = this.tiles[neighbor]
			if (n.flagged || (n.bomb && n.revealed)) {
				flagged_count += 1
			}
		}
		if (flagged_count == tile.number) {
			for (var neighbor of neighbors) {
				if (!this.tiles[neighbor].revealed) {
					this.reveal(neighbor)
				}
			}
		}

	}

	flag(index) {
		var tile = this.tiles[index]
		tile.flagged = !tile.flagged
		this.gui.draw_tile(index)
	}

	print_board() {
		for (var r = 0; r < this.height; r++) {
			let row = ""
			for (var c = 0; c < this.width; c++) {
				let tile = this.tiles[this.width * r + c]
				if (tile.revealed) {
					row += tile.bomb ? "x" : tile.number
				}
				else {
					row += "-"
				}
			}
			console.log(row)
		}
	}

}

class Tile {
	constructor() {
		this.bomb = false
		this.flagged = false;
		this.revealed = false;
		this.number = 0;
	}
}

class Gui {
	constructor() {
		this.tile_size = 50
		this.board = new Board(30, 16, 99)
		this.board.gui = this
		this.board.generate_tiles()
		this.first_click = false
		this.canvas = document.getElementById("game")
		this.ctx = this.canvas.getContext("2d", { alpha: false });
		this.resize()
		this.canvas.addEventListener("mousedown", this.on_mouse_down.bind(this))
		this.canvas.addEventListener("mouseup", this.on_mouse_up.bind(this))
	}

	resize() {
		this.canvas.width = this.board.width * this.tile_size
		this.canvas.height = this.board.height * this.tile_size
	}


	load_image(image_path) {
		return new Promise((resolve, reject) => {
			var image = new Image()
			image.addEventListener("load", () => {
				createImageBitmap(image, {resizeWidth: this.tile_size, resizeHeight: this.tile_size, resizeQuality: "high"}).then((bitmap) => {
					resolve(bitmap)
				})
			})
			image.src = image_path
		})
	}

	async load_images() {
		// Async function that assigns images to gui.images
		let all_image_requests = []
		for (var number = 0; number <= 8; number++) {
			all_image_requests.push(this.load_image("images/" + number + ".png"))
		}
		all_image_requests.push(this.load_image("images/bomb.png"))
		all_image_requests.push(this.load_image("images/facingDown.png"))
		all_image_requests.push(this.load_image("images/flagged.png"))
		this.images = await Promise.all(all_image_requests)
	}

	draw_tile(index) {
		var tile = this.board.tiles[index]
		var y = this.board.row(index) * this.tile_size
		var x = this.board.column(index) * this.tile_size
		var image_key = tile.flagged ? 11: 10
		if (tile.revealed) {
			image_key = tile.bomb ? 9 : tile.number
		}
		this.ctx.drawImage(this.images[image_key], x, y)
	}

	draw_board() {
		for (var i = 0; i < this.board.width * this.board.height; i++) {
			this.draw_tile(i)
		}
	}

	get_index(mouse_event) {
		let col = Math.floor(event.offsetX / this.tile_size)
		let row = Math.floor(event.offsetY / this.tile_size)
		return row * this.board.width + col
	}

	on_mouse_down(event) {
		let index = this.get_index(event)
		if (event.button == 2 && !this.board.tiles[index].revealed) {
			this.board.flag(index)
			this.draw_tile(index)
		}
	}

	on_mouse_up(event) {
		let index = this.get_index(event)
		let tile = this.board.tiles[index]
		if (tile.revealed && event.buttons != 0) {
			this.board.chord(index)
		} else if (event.button == 0 && !tile.revealed) {
			this.board.reveal(index)
		}
	}
}

var gui = new Gui()
gui.load_images().then(() => gui.draw_board())