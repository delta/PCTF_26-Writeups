<?php
class AhoCorasickNode {
    public $next = [];
    public $fail = null;
    public $output = [];

    public function __construct() {
        $this->next = [];
        $this->fail = null;
        $this->output = [];
    }
}

class AhoCorasick {

    private $root;

    public function __construct() {
        $this->root = new AhoCorasickNode();
    }

    // Insert pattern
    public function addPattern($pattern) {
        $node = $this->root;

        foreach (str_split($pattern) as $ch) {
            if (!isset($node->next[$ch])) {
                $node->next[$ch] = new AhoCorasickNode();
            }
            $node = $node->next[$ch];
        }

        $node->output[] = $pattern;
    }

    // Build failure links (BFS)
    public function build() {

        $queue = new SplQueue();

        // First level
        foreach ($this->root->next as $child) {
            $child->fail = $this->root;
            $queue->enqueue($child);
        }

        while (!$queue->isEmpty()) {

            $current = $queue->dequeue();

            foreach ($current->next as $char => $child) {

                $fail = $current->fail;

                while ($fail !== null && !isset($fail->next[$char])) {
                    $fail = $fail->fail;
                }

                if ($fail === null) {
                    $child->fail = $this->root;
                } else {
                    $child->fail = $fail->next[$char];
                }

                // Merge outputs
                $child->output = array_merge(
                    $child->output,
                    $child->fail->output
                );

                $queue->enqueue($child);
            }
        }
    }

    // Search text
    public function search($text) {

        $node = $this->root;
        $results = [];

        for ($i = 0; $i < strlen($text); $i++) {

            $ch = $text[$i];

            while ($node !== $this->root && !isset($node->next[$ch])) {
                $node = $node->fail;
            }

            if (isset($node->next[$ch])) {
                $node = $node->next[$ch];
            }

            if (!empty($node->output)) {
                foreach ($node->output as $pat) {
                    $results[] = [
                        "pattern" => $pat,
                        "index" => $i - strlen($pat) + 1
                    ];
                }
            }
        }

        return $results;
    }
}