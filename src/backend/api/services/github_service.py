import random


def fetch_and_process_stars(repo_list: list) -> list:

    results = []
    for repo_full_name in repo_list:
        random_stars = random.randint(1, 5)
        results.append({
            'label': repo_full_name,
            'stars': random_stars
        })

    return results